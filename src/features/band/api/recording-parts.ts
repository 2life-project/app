import { Directory, File, Paths } from 'expo-file-system';

import { logger } from '@/core/log/logger';

import { Sha256 } from './sha256';
import { fileOf } from './storage';

/**
 * Запись как груз для приёмника: хеш, по которому он проверит присланное, и
 * части, которыми она уезжает.
 */

/** Части файла для отправки: временные, живут ровно один запрос. */
const PARTS = 'band-parts';

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
