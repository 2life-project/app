import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';
import { deviceTimeZone } from '@/shared/lib/day';

import {
  claimRecording,
  completeUpload,
  fetchRecording,
  hashRecording,
  markUploaded,
  pendingUploads,
  readPart,
  recordingBytes,
  uploadPart,
  uuidFrom,
  type RemoteRecording,
  type SavedRecording,
} from '../api';

import { bindingsOfAccount, type Binding } from './binding';

/**
 * Выгрузка голосовых записей.
 *
 * Файл идёт частями и с докачкой: час звука весит семь мегабайт, а память
 * браслета держит пятнадцать часов — по сотовой сети это не одна попытка.
 * Сервер сам перечисляет принятые части, поэтому оборванная выгрузка
 * продолжается с места обрыва, а не начинается заново.
 *
 * Отправленной запись считается **только** по `audioStored`. Ни успешная
 * заявка, ни принятые части этого не значат: оригинал признан целым лишь
 * после того, как сервер сошёлся по размеру, хешу, контейнеру и кодеку.
 */

/** Одна запись за заход: длинная выгрузка всё равно не успеет в фоновое окно. */
const PER_RUN = 1;

/** Сколько раз спросить о готовности после сборки файла. Проверка идёт секунды. */
const VERIFY_ATTEMPTS = 3;
const VERIFY_PAUSE_MS = 2000;

let running = false;

export async function uploadRecordings(): Promise<void> {
  const account = currentUser()?.sub;
  if (!account || running) return;

  // Файл записи не помнит, с какого браслета он пришёл, — а браслет у аккаунта
  // один: привязка на телефоне хранится одним значением.
  const binding = (await bindingsOfAccount(account))[0];
  if (!binding) return;

  running = true;
  try {
    for (const recording of pendingUploads().slice(0, PER_RUN)) {
      await send(binding, recording);
    }
  } catch (failure) {
    // Сеть, недоступное хранилище, отказ приёмника — всё это норма для фона.
    // Файл остаётся на телефоне непомеченным и уедет в следующий заход.
    logger.warn('band: запись не выгрузилась', { reason: String(failure) });
  } finally {
    running = false;
  }
}

async function send(binding: Binding, recording: SavedRecording): Promise<void> {
  const bytes = recordingBytes(recording.session);
  if (bytes === null) return;

  if (bytes > binding.limits.maxAudioBytes) {
    logger.error('band: запись длиннее предела приёмника', {
      session: recording.session,
      bytes,
    });
    return;
  }

  const sha256 = hashRecording(recording.session);
  if (sha256 === null) return;

  let remote = await claimRecording(binding.bandId, {
    bindingVersion: binding.bindingVersion,
    clientInstanceId: binding.clientInstanceId,
    // Считается из адреса устройства и номера сессии: повторная заявка после
    // обрыва обязана попасть в ту же запись, а не завести вторую.
    clientRecordingId: uuidFrom(`${binding.bandId}|recording|${recording.session}`),
    deviceEpoch: binding.epoch,
    timezone: deviceTimeZone(),
    session: recording.session,
    startedAt: recording.startedAt.toISOString(),
    deviceBytes: recording.deviceBytes,
    uploadBytes: bytes,
    seconds: recording.seconds,
    sha256,
    marks: recording.marks,
  });

  if (remote.audioStored) {
    markUploaded(recording.session);
    return;
  }

  await pushParts(recording.session, bytes, remote);
  remote = await completeUpload(remote.id);

  // Сборка и проверка файла идут фоновым заданием сервера. Ждём его недолго:
  // не дождались — запись просто останется неотмеченной до следующего захода,
  // потерять её это не может.
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS && !remote.audioStored; attempt += 1) {
    await pause(VERIFY_PAUSE_MS);
    remote = await fetchRecording(remote.id);
  }

  if (remote.audioStored) markUploaded(recording.session);
  else logger.info('band: запись принята, проверка ещё идёт', { session: recording.session });
}

/** Дослать недостающие части. Уже принятые сервер перечисляет сам. */
async function pushParts(session: number, bytes: number, remote: RemoteRecording): Promise<void> {
  const size = remote.partBytes;
  const stored = new Set(remote.parts.map((part) => part.partNumber));
  const total = Math.ceil(bytes / size);

  for (let part = 0; part < total; part += 1) {
    if (stored.has(part)) continue;

    const offset = part * size;
    const chunk = readPart(session, offset, Math.min(size, bytes - offset));
    if (chunk === null) return;

    await uploadPart(remote.id, part, chunk);
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
