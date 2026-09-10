import { currentUser } from '@/core/auth';
import { HttpError } from '@/core/http/client';
import { logger } from '@/core/log/logger';
import { deviceTimeZone } from '@/shared/lib/day';

import {
  claimRecording,
  completeUpload,
  fetchRecording,
  hashRecording,
  markUploaded,
  partFile,
  pendingUploads,
  recordingBytes,
  uploadPart,
  uuidFrom,
  type RemoteRecording,
  type SavedRecording,
} from '../api';

import { latestBinding, type Binding } from './binding';

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

  // Файл записи не помнит, с какого браслета он пришёл; действующая привязка
  // аккаунта — последняя заведённая.
  const binding = await latestBinding(account);
  if (!binding) return;

  running = true;
  try {
    // Старые первыми: иначе при постоянном притоке новых записей старые не
    // уехали бы никогда — за заход берётся одна.
    const queue = pendingUploads().sort((a, b) => a.session - b.session);
    for (const recording of queue.slice(0, PER_RUN)) {
      await send(binding, recording);
    }
  } catch (failure) {
    // Файл остаётся на телефоне непомеченным и уедет в следующий заход. Отказ
    // сервера уже записан клиентом; сетевой — нет, а в релизе виден только
    // `error`.
    if (failure instanceof HttpError) {
      logger.warn('band: запись не принята сервером', { status: failure.status });
    } else {
      logger.error('band: запись не дошла до сервера', { reason: String(failure) });
    }
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

  const sha256 = await hashRecording(recording.session);
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

  // Сборка без всех частей дала бы файл, который никогда не сойдётся по хешу.
  if (!(await pushParts(recording.session, bytes, remote))) return;
  remote = await completeUpload(remote.id);

  // Сборка и проверка файла идут фоновым заданием сервера. Ждём его недолго:
  // не дождались — запись просто останется неотмеченной до следующего захода,
  // потерять её это не может.
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS && !remote.audioStored; attempt += 1) {
    await pause(VERIFY_PAUSE_MS);
    remote = await fetchRecording(remote.id);
  }

  if (remote.audioStored) {
    markUploaded(recording.session);
  } else if (remote.error) {
    // Сервер назвал причину: файл не сошёлся по хешу, размеру или формату.
    // Это не «ещё проверяет» — это отказ, и его надо видеть.
    logger.error('band: сервер не принял запись', { session: recording.session, ...remote.error });
  } else {
    logger.warn('band: запись принята, проверка ещё идёт', { session: recording.session });
  }
}

/**
 * Дослать недостающие части. Уже принятые сервер перечисляет сам — и не
 * только номером: часть, оборванная на прошлой попытке, значится с другим
 * размером, а заменить уже записанную приёмник не даёт. Такой файл дослать
 * нельзя, и это ошибка, а не пропуск.
 */
async function pushParts(
  session: number,
  bytes: number,
  remote: RemoteRecording,
): Promise<boolean> {
  const size = remote.partBytes;
  const total = Math.ceil(bytes / size);
  const stored = new Map(remote.parts.map((part) => [part.partNumber, part.bytes]));

  for (let part = 0; part < total; part += 1) {
    const expected = Math.min(size, bytes - part * size);
    const got = stored.get(part);
    if (got === expected) continue;
    if (got !== undefined) {
      logger.error('band: часть записи на сервере другого размера', {
        session,
        part,
        got,
        expected,
      });
      return false;
    }

    const prepared = partFile(session, part, size);
    if (!prepared) return false;

    try {
      await uploadPart(remote.id, part, prepared.file);
    } finally {
      if (prepared.temporary) prepared.file.delete();
    }
  }
  return true;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
