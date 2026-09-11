import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { sourceCaption, vitalsOf, type BandReadings } from '@/shared/domain';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import { ActionLink, Card, SectionCaption, Stack, StatTile, Text, VitalsList } from '@/shared/ui';

/**
 * Активность, когда сервер не ответил, а браслет — да.
 *
 * Показания лежат на телефоне и от сети не зависят: они сняты по Bluetooth и
 * никуда не отправлялись. Показывать вместо них «не удалось загрузить» значит
 * прятать единственные данные, которые у человека сейчас есть, — и ровно те,
 * что он собрал своим телом за сегодня.
 */
export function BandOnly({ band, device }: { band: BandReadings; device?: ReactNode }) {
  const vitals = vitalsOf(band);

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">The server did not answer</Text>
          <Text variant="bodySmall" tone="muted">
            Scores and norms are missing until it does. What your band measured is here — it lives
            on this phone.
          </Text>
        </Stack>
      </Card>

      <Stack gap="sm">
        <SectionCaption>{sourceCaption(band)}</SectionCaption>
        <Card>
          <View style={styles.tiles}>
            <StatTile label="STEPS" value={text(band.steps)} />
            <StatTile
              label="DISTANCE"
              value={
                band.distanceMeters === undefined ? '—' : (band.distanceMeters / 1000).toFixed(1)
              }
              unit="km"
            />
            <StatTile label="ENERGY" value={text(band.calories)} unit="kcal" />
          </View>
        </Card>
      </Stack>

      {vitals.length > 0 ? <VitalsList caption={sourceCaption(band)} vitals={vitals} /> : null}

      {device}
      <ActionLink label="Open the band" chevron onPress={() => router.push(to.device())} />
    </Stack>
  );
}

function text(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
});
