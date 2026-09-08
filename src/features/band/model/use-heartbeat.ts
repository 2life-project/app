import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

/**
 * Пульс, который можно почувствовать: телефон отбивает ритм текущего замера.
 *
 * Ритм, а не сами удары. Браслет отдаёт частоту, но не моменты сокращений —
 * поток RR-интервалов он не открывает, — поэтому совпадает темп, а не фаза.
 * Обещать синхронность нельзя: человек приложит палец к шее и увидит расхождение.
 */

/** Задержка второго удара: «туп» приходит вслед за «тук», а не вместе с ним. */
const SECOND_BEAT_MS = 130;

/** Ниже этого частота — ошибка замера, а не человек. Вибрировать по ней нельзя. */
const MIN_BPM = 30;
const MAX_BPM = 220;

export function useHeartbeat(bpm: number | undefined) {
  const [on, setOn] = useState(false);
  const usable = bpm !== undefined && bpm >= MIN_BPM && bpm <= MAX_BPM;

  useEffect(() => {
    if (!on || !usable || bpm === undefined) return;

    let second: ReturnType<typeof setTimeout> | null = null;

    const beat = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      second = setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }, SECOND_BEAT_MS);
    };

    beat();
    const timer = setInterval(beat, (60 * 1000) / bpm);

    return () => {
      clearInterval(timer);
      if (second) clearTimeout(second);
    };
  }, [bpm, on, usable]);

  return { on: on && usable, available: usable, toggle: () => setOn((value) => !value) };
}
