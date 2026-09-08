import type { ChatMessage } from '../api/contract';

/**
 * Что показать из переписки. Сервер называет роль словом, и слов у него
 * больше двух: кроме человека и ассистента бывают служебные — их на экран
 * не пускаем, иначе в диалоге появятся реплики, которых никто не писал.
 */
export type Side = 'you' | 'assistant';

export function sideOf(role: string): Side | null {
  if (role === 'user') return 'you';
  if (role === 'assistant') return 'assistant';
  return null;
}

export type Shown = { id: string; side: Side; text: string };

export function shownMessages(messages: readonly ChatMessage[]): Shown[] {
  return messages.flatMap((message) => {
    const side = sideOf(message.role);
    if (side === null || message.content.trim() === '') return [];
    return [{ id: message.id, side, text: message.content }];
  });
}

/** Последняя ветка — та, в которую писали позже всех. */
export function latestThread<T extends { id: string; updatedAt: number }>(
  threads: readonly T[],
): T | null {
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
