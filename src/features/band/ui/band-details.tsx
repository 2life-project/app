import { Sheet } from '@/shared/ui';

import type { BandState } from '../model/use-band';

import { HeartDetail } from './heart-detail';
import { MeasurementsDetail } from './measurements-detail';
import { SleepDetail } from './sleep-detail';
import { StressDetail } from './stress-detail';
import { WalkDetail } from './walk-detail';
import { WorkoutsDetail } from './workouts-detail';

/** Какой блок раскрыт. `null` — панель закрыта. */
export type DetailKind = 'heart' | 'walk' | 'sleep' | 'stress' | 'measurements' | 'workouts' | null;

const TITLES: Record<Exclude<DetailKind, null>, string> = {
  heart: 'Пульс',
  walk: 'Ходьба',
  sleep: 'Сон',
  stress: 'Стресс',
  measurements: 'Замеры',
  workouts: 'Активность',
};

/**
 * Разбор одного показателя панелью снизу.
 *
 * Панелью, а не экраном: раздел живёт внутри вкладки Главной и своего места в
 * маршрутах не имеет, а заводить его ради временного раздела значит менять
 * навигацию всего приложения под то, что скоро переедет.
 */
export function BandDetails({
  kind,
  state,
  onClose,
}: {
  kind: DetailKind;
  state: BandState;
  onClose: () => void;
}) {
  return (
    <Sheet visible={kind !== null} onClose={onClose} title={kind ? TITLES[kind] : ''}>
      {kind === 'heart' ? <HeartDetail state={state} /> : null}
      {kind === 'walk' ? <WalkDetail state={state} /> : null}
      {kind === 'sleep' ? <SleepDetail state={state} /> : null}
      {kind === 'stress' ? <StressDetail state={state} /> : null}
      {kind === 'measurements' ? <MeasurementsDetail state={state} /> : null}
      {kind === 'workouts' ? (
        <WorkoutsDetail recorded={state.recorded} states={state.states} />
      ) : null}
    </Sheet>
  );
}
