import { useState } from 'react';

import { Sheet, Stack } from '@/shared/ui';

import type { SleepSession } from '../api';
import { useBand } from '../model/use-band';
import { useNights } from '../model/use-nights';

import { BandDetails, type DetailKind } from './band-details';
import { SleepCard } from './sleep-card';
import { SleepDetail } from './sleep-detail';
import { SleepHistory } from './sleep-history';
import { StressCard } from './stress-card';

/**
 * Сон и стресс браслета в разделе «Восстановление».
 *
 * Последняя ночь — карточкой, все ночи с телефона — списком: устройство
 * помнит четверо суток, телефон — три месяца. Любая ночь открывается разбором.
 */
export function BandRecoverySection() {
  const band = useBand();
  const nights = useNights(band.state.sleep);
  const [night, setNight] = useState<SleepSession | null>(null);
  const [detail, setDetail] = useState<DetailKind>(null);
  if (!band.paired) return null;
  const { state } = band;
  const latest = state.sleep[state.sleep.length - 1] ?? nights[nights.length - 1];

  return (
    <Stack gap="md">
      <SleepCard
        night={latest}
        reading={state.busy}
        onOpen={() => {
          if (latest) setNight(latest);
        }}
      />
      <SleepHistory nights={nights} onOpen={setNight} />
      <StressCard state={state} onOpen={() => setDetail('stress')} />
      <Sheet visible={night !== null} onClose={() => setNight(null)} title="Sleep">
        <SleepDetail night={night ?? undefined} />
      </Sheet>
      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />
    </Stack>
  );
}
