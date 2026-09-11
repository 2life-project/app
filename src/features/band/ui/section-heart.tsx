import { useState } from 'react';

import { Stack } from '@/shared/ui';

import { timeAxis } from '../model/day-metrics';
import { useBand } from '../model/use-band';

import { BandDetails, type DetailKind } from './band-details';
import { HeartCard } from './heart-card';

/**
 * Пульс браслета в разделе «Сердце».
 *
 * Карточки живут в разделах, а не на экране устройства: человек ищет пульс
 * там, где сердце. Без привязанного браслета секции нет — раздел показывает
 * серверные показатели, как и без устройства.
 */
export function BandHeartSection() {
  const band = useBand();
  const [detail, setDetail] = useState<DetailKind>(null);
  if (!band.paired) return null;
  const { state } = band;

  return (
    <Stack gap="md">
      <HeartCard state={state} axis={timeAxis(state.today)} onOpen={() => setDetail('heart')} />
      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />
    </Stack>
  );
}
