import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

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

  // Частота приезжает каждые десять секунд и почти всегда та же самая. Если
  // держать её в зависимостях как есть, таймер пересобирается на каждый отчёт
  // и лишний удар бьётся вне ритма. Округление до целого делает повтор
  // повтором: перезаводимся, только когда пульс правда изменился.
  const beats = usable && bpm !== undefined ? Math.round(bpm) : 0;

  useEffect(() => {
    if (!on || beats === 0) return;

    // В кармане и на локе телефон стучать не должен: человек включил это,
    // чтобы почувствовать ритм на экране, а не чтобы носить вибрацию с собой.
    if (AppState.currentState !== 'active') return;

    let second: ReturnType<typeof setTimeout> | null = null;

    const beat = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      second = setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }, SECOND_BEAT_MS);
    };

    beat();
    const timer = setInterval(beat, (60 * 1000) / beats);

    return () => {
      clearInterval(timer);
      if (second) clearTimeout(second);
    };
  }, [beats, on]);

  return { on: on && usable, available: usable, toggle: () => setOn((value) => !value) };
}
