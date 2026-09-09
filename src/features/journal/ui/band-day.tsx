import { router } from 'expo-router';

import { readingsNote, useBandReadings, vitalsOf } from '@/shared/domain';
import { to } from '@/shared/nav';
import { ActionLink, Card, ListRow, SectionCaption, Stack } from '@/shared/ui';

/**
 * Что тело делало в этот день — рядом с тем, что человек записал сам.
 *
 * В журнале лежат события, которые человек завёл: приёмы, тренировки, заметки.
 * Ночь и пульс он не заводит — их меряет браслет, и без них день в дневнике
 * состоит только из намерений.
 *
 * Показаний за прошлые дни в общем слое нет: он держит сегодняшние. Для
 * остальных дней блока просто не будет — обещать историю, которой здесь нет,
 * хуже, чем её не показывать.
 */
export function BandDay({ day }: { day: string }) {
  const band = useBandReadings(day);
  const vitals = vitalsOf(band);

  if (!band || vitals.length === 0) return null;

  return (
    <Stack gap="sm">
      <SectionCaption>{(readingsNote(band) ?? 'from your band').toUpperCase()}</SectionCaption>
      <Card>
        <Stack gap="xs">
          {band.steps === undefined ? null : (
            <ListRow
              title="Steps"
              subtitle={
                band.distanceMeters === undefined
                  ? undefined
                  : `${(band.distanceMeters / 1000).toFixed(1)} km`
              }
              trailing={String(band.steps)}
            />
          )}
          {vitals.map((vital) => (
            <ListRow
              key={vital.id}
              title={vital.title}
              subtitle={vital.note}
              trailing={vital.value}
            />
          ))}
          <ActionLink label="Open the band" chevron onPress={() => router.push(to.device())} />
        </Stack>
      </Card>
    </Stack>
  );
}
