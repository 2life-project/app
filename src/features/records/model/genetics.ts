import type { GeneticUpload } from '../api/contract';

/**
 * Какую загрузку показывать. Последнюю разобранную: неразобранная отчёта не
 * даст, а самая свежая по времени — не обязательно та, что уже прочитана.
 */
export function latestParsed(uploads: readonly GeneticUpload[]): GeneticUpload | null {
  return (
    [...uploads]
      .filter((upload) => upload.parsedAt !== null)
      .sort((a, b) => (b.parsedAt ?? 0) - (a.parsedAt ?? 0))[0] ?? null
  );
}

/** Название темы из ключа: сервер даёт `cardio_health`, человек читает слова. */
export function sectionTitle(id: string): string {
  return id.replace(/[_-]/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}
