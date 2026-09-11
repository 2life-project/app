import { Directory, File, Paths } from 'expo-file-system';

import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import { toOgg, durationSeconds } from './audio';
import { Sha256 } from './sha256';

/**
 * Записи с браслета на телефоне.
 *
 * Файл хранится в том виде, в каком пришёл — Opus в контейнере Ogg. Час записи
 * занимает семь мегабайт, поэтому чистить хранилище по расписанию не нужно:
 * место освобождается, когда запись выгружена и подтверждена сервером.
 *
 * Имя файла — время начала записи, оно же её идентификатор на устройстве. Так
 * список на телефоне и список на браслете сходятся без отдельной таблицы.
 *
 * Папка — своя у каждого аккаунта. Записи принадлежат тому, кто их наговорил:
 * телефоном пользуются двое, и файлы первого не должны ни показываться
 * второму, ни уехать на сервер под его именем.
 */

const FOLDER = 'band-recordings';

/** Части файла для отправки: временные, живут ровно один запрос. */
const PARTS = 'band-parts';

export type SavedRecording = {
  session: number;
  startedAt: Date;
  uri: string;
  /**
   * Длина исходного потока с устройства: из неё считается длительность.
   * Имя развёрнутое намеренно — рядом живёт второй размер, и «bytes» с
   * «fileBytes» на приёмной стороне путают постоянно.
   */
  deviceBytes: number;
  /** Размер файла Ogg, который реально уедет в хранилище: он больше на служебные данные. */
  uploadBytes: number;
  seconds: number;
  /** Выгружена ли на сервер. */
  uploaded: boolean;
  /** Метки, поставленные кнопкой во время записи. */
  marks: RecordingMark[];
};

/** Точка интереса внутри записи: человек нажал кнопку в этот момент. */
export type RecordingMark = {
  /** Номер метки в этой записи. */
  index: number;
  /** Смещение от начала файла. */
  offsetSeconds: number;
};

/** Папка записей аккаунта — текущего, если не сказано иначе. `null` — никто не вошёл. */
function folder(account = currentUser()?.sub): Directory | null {
  if (!account) return null;

  const directory = new Directory(Paths.document, FOLDER, account);
  if (!directory.exists) {
    directory.create({ intermediates: true });
    adoptLegacy(directory);
  }
  return directory;
}

/**
 * Записи, сохранённые до того, как папки стали именными, лежат в корне. Чьи
 * они, узнать уже нельзя; терять их — хуже: на браслете их давно нет. Они
 * достаются первому, кто вошёл после обновления, — один раз.
 */
function adoptLegacy(target: Directory): void {
  const root = new Directory(Paths.document, FOLDER);
  for (const entry of root.list()) {
    if (!(entry instanceof File)) continue;
    try {
      entry.move(new File(target, entry.name));
    } catch (failure) {
      logger.error('band: старая запись не перенеслась в папку аккаунта', { failure });
    }
  }
}

/**
 * Имя несёт длину исходного потока, а не только номер сессии.
 *
 * Длительность считается из сырых байт с устройства: ровно две тысячи в
 * секунду. Размер файла на диске для этого не годится — упаковка в Ogg
 * добавляет служебные страницы и по несколько десятков байт на каждую секунду
 * звука, и посчитанная из него длительность завышена на несколько процентов.
 * Восстановить исходную длину из файла нельзя, поэтому она в имени.
 *
 * Выгруженные помечаются переименованием: отдельный индекс рассинхронизируется.
 */
function nameOf(session: number, rawBytes: number, uploaded: boolean): string {
  return `${session}.${rawBytes}${uploaded ? '.sent' : ''}.ogg`;
}

function parseName(name: string): { session: number; rawBytes: number; uploaded: boolean } | null {
  const match = /^(\d+)\.(\d+)(\.sent)?\.ogg$/.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return {
    session: Number(match[1]),
    rawBytes: Number(match[2]),
    uploaded: Boolean(match[3]),
  };
}

/**
 * Сохранить запись. Принимает сырой поток пакетов с устройства и упаковывает
 * его в Ogg — так файл сразу играется и принимается сервисами распознавания.
 */
export function saveRecording(session: number, raw: Uint8Array, account?: string): SavedRecording {
  // Аккаунт берётся тем, кто начал выгрузку, — до того, как файл забрали с
  // устройства: сессия за время долгой качки могла смениться, а файл уже в
  // руках и обязан лечь в папку того, для кого его забирали.
  const home = folder(account);
  if (!home) throw new Error('band: записи некуда сохранить — никто не вошёл');

  // Имя несёт длину потока, поэтому докачанная заново запись легла бы вторым
  // файлом рядом с первым: `fileOf` вернул бы любой из них, отметка об отправке
  // легла бы на один, а второй уехал бы на сервер ещё раз.
  const previous = fileOf(session);
  if (previous) previous.delete();

  const file = new File(home, nameOf(session, raw.length, false));
  if (!file.exists) file.create();
  file.write(toOgg(raw));

  return {
    session,
    startedAt: new Date(session * 1000),
    uri: file.uri,
    deviceBytes: raw.length,
    uploadBytes: file.size ?? 0,
    seconds: durationSeconds(raw.length),
    uploaded: false,
    marks: marksOf(session),
  };
}

/** Что уже лежит на телефоне. */
export function savedRecordings(): SavedRecording[] {
  const items: SavedRecording[] = [];

  for (const entry of folder()?.list() ?? []) {
    if (!(entry instanceof File)) continue;
    const parsed = parseName(entry.name);
    if (!parsed) continue;

    items.push({
      session: parsed.session,
      startedAt: new Date(parsed.session * 1000),
      uri: entry.uri,
      deviceBytes: parsed.rawBytes,
      uploadBytes: entry.size ?? 0,
      seconds: durationSeconds(parsed.rawBytes),
      uploaded: parsed.uploaded,
      marks: marksOf(parsed.session),
    });
  }

  return items.sort((a, b) => b.session - a.session);
}

/** Уже сохранённые сессии — чтобы не качать с браслета то, что есть. */
export function savedSessions(): Set<number> {
  return new Set(savedRecordings().map((item) => item.session));
}

export function pendingUploads(): SavedRecording[] {
  return savedRecordings().filter((item) => !item.uploaded);
}

/**
 * Метки хранятся рядом с записью отдельным файлом.
 *
 * Они приходят отчётами по ходу записи, задолго до того, как файл скачан, и
 * держать их в памяти нельзя: приложение закроют, а метка — единственное, что
 * человек в этой записи отметил сам.
 */
function marksFile(session: number): File | null {
  const home = folder();
  return home ? new File(home, `${session}.marks.json`) : null;
}

export function rememberMark(session: number, mark: RecordingMark): void {
  const file = marksFile(session);
  if (!file) return;

  const marks = marksOf(session).filter((item) => item.index !== mark.index);
  marks.push(mark);
  marks.sort((a, b) => a.offsetSeconds - b.offsetSeconds);

  if (!file.exists) file.create();
  file.write(JSON.stringify(marks));
}

export function marksOf(session: number): RecordingMark[] {
  const file = marksFile(session);
  if (!file?.exists) return [];

  try {
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? (parsed as RecordingMark[]) : [];
  } catch (error) {
    logger.warn('band: метки не прочитались', { session, reason: String(error) });
    return [];
  }
}

/**
 * Найти файл сессии. Перебором, а не сборкой имени: в имени лежит ещё и длина
 * исходного потока, и вызывающий её не знает.
 */
function fileOf(session: number): File | null {
  for (const entry of folder()?.list() ?? []) {
    if (!(entry instanceof File)) continue;
    if (parseName(entry.name)?.session === session) return entry;
  }
  return null;
}

/** Отметить выгруженной. Файл остаётся: его ещё можно послушать. */
export function markUploaded(session: number): void {
  const source = fileOf(session);
  const parsed = source ? parseName(source.name) : null;
  if (!source || !parsed || parsed.uploaded) return;

  source.move(new File(source.parentDirectory, nameOf(session, parsed.rawBytes, true)));
}

export function removeSaved(session: number): void {
  fileOf(session)?.delete();

  const marks = marksFile(session);
  if (marks?.exists) marks.delete();
}

/** Размер файла на диске. `null` — записи уже нет. */
export function recordingBytes(session: number): number | null {
  return fileOf(session)?.size ?? null;
}

/**
 * Хеш файла записи — тот, по которому приёмник проверит присланное.
 *
 * Считается потоком, кусками, и между кусками отдаёт поток интерфейсу: час
 * записи весит семь мегабайт, а память диктофона держит пятнадцать часов.
 * Читать такой файл в память целиком нельзя — это падение, — а считать его
 * одним куском значит заморозить экран на секунды сразу после подключения.
 */
const HASH_CHUNK = 256 << 10;

const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function hashRecording(session: number): Promise<string | null> {
  const file = fileOf(session);
  if (!file) return null;

  const handle = file.open();
  try {
    const hash = new Sha256();
    for (;;) {
      const chunk = handle.readBytes(HASH_CHUNK);
      if (chunk.length === 0) break;
      hash.update(chunk);
      await breathe();
    }
    return hash.digest();
  } catch (error) {
    // Без хеша запись не уедет никогда, и это надо видеть.
    logger.error('band: запись не прочиталась для хеша', { session, reason: String(error) });
    return null;
  } finally {
    handle.close();
  }
}

/** Файл, который уедет одной частью: сама запись или её вырезанный кусок. */
export type PartFile = { file: File; temporary: boolean };

/**
 * Часть файла для отправки.
 *
 * Приёмник принимает запись частями и умеет докачку, а отправляет части
 * нативная загрузка — файлом, не байтами через мост. Запись, которая целиком
 * помещается в часть, уезжает как есть; длинная режется на временные файлы,
 * и каждый живёт ровно один запрос — убирает его вызывающий.
 */
export function partFile(session: number, partNumber: number, partBytes: number): PartFile | null {
  const source = fileOf(session);
  if (!source) return null;
  if (source.size <= partBytes) return { file: source, temporary: false };

  const parts = new Directory(Paths.cache, PARTS);
  if (!parts.exists) parts.create({ intermediates: true });
  const part = new File(parts, `${session}.${partNumber}.part`);

  const handle = source.open();
  try {
    handle.offset = partNumber * partBytes;
    const bytes = handle.readBytes(Math.min(partBytes, source.size - partNumber * partBytes));
    if (part.exists) part.delete();
    part.create();
    part.write(bytes);
    return { file: part, temporary: true };
  } catch (error) {
    // Пропущенная часть — это неполный файл на сервере, и молчать тут нельзя.
    logger.error('band: часть записи не подготовилась', {
      session,
      partNumber,
      reason: String(error),
    });
    return null;
  } finally {
    handle.close();
  }
}
