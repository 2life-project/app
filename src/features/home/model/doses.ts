import { usePersistentState } from '@/shared/lib/store';

import { SUPPLEMENT_STACKS } from './overview';

/**
 * Отметки приёма за день. Это единственное действие, которое человек делает
 * на Главной каждый день, поэтому оно должно переживать перезапуск: иначе
 * приложение каждый раз спрашивает то, на что уже ответили.
 */
export type Doses = Record<string, boolean>;

const INITIAL: Doses = Object.fromEntries(
  SUPPLEMENT_STACKS.map((stack) => [stack.id, stack.taken]),
);

export function useDoses(): {
  taken: Doses;
  toggle: (id: string) => void;
  done: number;
  total: number;
} {
  const [taken, setTaken] = usePersistentState<Doses>('doses', INITIAL);
  const total = SUPPLEMENT_STACKS.length;
  const done = SUPPLEMENT_STACKS.filter((stack) => taken[stack.id]).length;

  return {
    taken,
    toggle: (id) => setTaken({ ...taken, [id]: !taken[id] }),
    done,
    total,
  };
}
