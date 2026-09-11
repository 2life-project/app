import { useState } from 'react';

import { Stack } from '@/shared/ui';

import { useBand } from '../model/use-band';

import { BandDetails, type DetailKind } from './band-details';
import { OxygenCard } from './oxygen-card';

/** Кислород крови в разделе «Дыхание»: значение, ряд за день и разовый замер. */
export function BandBreathingSection() {
  const band = useBand();
  const [detail, setDetail] = useState<DetailKind>(null);
  if (!band.paired) return null;
  const { state } = band;

  return (
    <Stack gap="md">
      <OxygenCard
        state={state}
        live={state.stage === 'connected'}
        onMeasure={band.measure}
        onOpen={() => setDetail('measurements')}
      />
      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />
    </Stack>
  );
}
