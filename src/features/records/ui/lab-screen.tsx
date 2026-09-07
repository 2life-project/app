import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { shortDay } from '@/shared/lib/day';
import { radius, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Card,
  LineChart,
  ListRow,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
  StatTile,
  Tag,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { MarkerTrend, Observation } from '../api/contract';
import { fetchMarkerHistory, fetchMarkerOverview, fetchMarkerTrend } from '../api/records';
import { chartable, markerTone, scalePosition } from '../model/biochemistry';

export const LabScreenOptions = { headerShown: false };

/** Показатель биохимии: значение против нормы, динамика, измерения, источники. */
export function LabScreen({ id }: { id: string }) {
  const [sources, setSources] = useState(false);

  const overview = useQuery(`marker:${id}`, (signal) => fetchMarkerOverview(id, signal));
  const trend = useQuery(`marker:${id}:trend`, (signal) => fetchMarkerTrend(id, signal));
  const history = useQuery(sources ? `marker:${id}:history` : null, (signal) =>
    fetchMarkerHistory(id, signal),
  );

  const data = overview.data;
  const values = chartable(trend.data?.points ?? []);

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={data?.displayName ?? id}
          subtitle={data?.latest?.date ? shortDay(data.latest.date) : 'loading…'}
        />

        {!data ? (
          <Card variant="sunken">
            <Text tone="muted">
              {overview.loading ? 'Loading the marker…' : 'The marker did not load.'}
            </Text>
          </Card>
        ) : (
          <>
            <Card>
              <Stack gap="md">
                <Stack direction="row" justify="space-between" align="center">
                  <Stack direction="row" gap="xs" align="baseline">
                    <Text variant="display">{value(data.latest)}</Text>
                    <Text variant="bodySmall" tone="muted">
                      {data.latest?.unit ?? ''}
                    </Text>
                  </Stack>
                  <Tag
                    label={(data.clinicalStatus.label ?? data.clinicalStatus.code).toUpperCase()}
                    tone={markerTone(data.clinicalStatus.code)}
                    dot
                  />
                </Stack>

                <Scale observation={data.latest} />

                {data.clinicalStatus.reason ? (
                  <Text tone="muted">{data.clinicalStatus.reason}</Text>
                ) : null}
              </Stack>
            </Card>

            <References trend={trend.data} unit={data.latest?.unit ?? null} />

            {values.length > 1 ? (
              <WidgetCard
                title={`${values.length} measurements`}
                caption={trend.data?.period ?? undefined}>
                <LineChart values={values} tone={chartTone(data.clinicalStatus.code)} />
              </WidgetCard>
            ) : null}

            {/* Свежесть — отдельное утверждение сервера: старое значение
                остаётся значением, но читать его надо иначе. */}
            {data.freshness.reason ? (
              <Card variant="sunken">
                <Text tone="muted">{data.freshness.reason}</Text>
              </Card>
            ) : null}

            <Card variant="flat">
              <ActionLink
                label="All measurements and sources"
                chevron
                onPress={() => setSources(true)}
              />
            </Card>
          </>
        )}
      </Stack>

      <Sheet
        visible={sources}
        onClose={() => setSources(false)}
        title="All measurements"
        action={<ActionLink label="Done" onPress={() => setSources(false)} />}>
        <Stack gap="sm">
          {(history.data?.observations ?? []).map((observation) => (
            <ListRow
              key={observation.id}
              title={observation.date ? shortDay(observation.date) : 'no date'}
              subtitle={observation.documentFilename}
              trailing={`${value(observation)} ${observation.unit ?? ''}`.trim()}
              // Сервер сам говорит, какие измерения сравнимы между собой:
              // отсеянное он на график не пускает, и здесь это тоже видно.
              trailingCaption={observation.chartEligibility.eligible ? undefined : 'not comparable'}
            />
          ))}
          {history.loading ? <Text tone="muted">Loading the history…</Text> : null}
          <Text variant="footnote" tone="muted">
            Recognised documents keep the lab as the source; a manual entry stays marked as yours.
          </Text>
        </Stack>
      </Sheet>
    </Screen>
  );
}

/**
 * У графика палитра уже: нейтрального тона в ней нет. Незнакомый статус
 * рисуем акцентом — это «не знаем», а не «всё хорошо» и не «тревога».
 */
function chartTone(code: string): 'success' | 'warning' | 'danger' | 'highlight' {
  const tone = markerTone(code);
  return tone === 'success' || tone === 'warning' || tone === 'danger' ? tone : 'highlight';
}

function value(observation: Observation | null | undefined): string {
  if (!observation) return '—';
  if (observation.rawValueText) return observation.rawValueText;
  return observation.value === null ? '—' : String(observation.value);
}

/**
 * Шкала между границами нормы. Границы объявил сервер: без них шкалы нет,
 * потому что рисовать её от нуля значит придумать норму за лабораторию.
 */
function Scale({ observation }: { observation: Observation | null }) {
  const at = scalePosition(
    observation?.value ?? null,
    observation?.refLow ?? null,
    observation?.refHigh ?? null,
  );
  if (at === null || !observation) return null;

  return (
    <Stack gap="xs">
      <View>
        <View style={styles.scale}>
          <View style={[styles.zone, styles.zoneIn]} />
        </View>
        <View style={[styles.marker, { left: `${at * 100}%` }]} />
      </View>
      <Stack direction="row" justify="space-between">
        <Text variant="footnote" tone="muted">
          {observation.refLow}
        </Text>
        <Text variant="footnote" tone="muted">
          {observation.refText ?? 'lab reference'}
        </Text>
        <Text variant="footnote" tone="muted">
          {observation.refHigh}
        </Text>
      </Stack>
    </Stack>
  );
}

/**
 * Норм бывает несколько. Лабораторная напечатана в бланке, остальные — это
 * позиция сервиса; складывать их в одно число нельзя, поэтому показываем рядом.
 */
function References({ trend, unit }: { trend: MarkerTrend | null; unit: string | null }) {
  const sources = trend?.refSources;
  if (!sources) return null;

  const tiles = [
    { label: 'LAB', range: sources.labVariants[0] ?? null },
    { label: 'STANDARD', range: sources.standard },
    { label: 'OPTIMAL', range: sources.optimal },
  ].filter((tile) => tile.range !== null);

  if (tiles.length === 0) return null;

  return (
    <Card>
      <Stack gap="sm">
        <Text variant="subtitle">What counts as normal</Text>
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <StatTile
              key={tile.label}
              label={tile.label}
              value={range(tile.range)}
              note={sources.refUnit ?? unit ?? undefined}
            />
          ))}
        </View>
      </Stack>
    </Card>
  );
}

function range(bounds: { refLow: number | null; refHigh: number | null } | null): string {
  if (!bounds) return '—';
  const { refLow, refHigh } = bounds;
  if (refLow !== null && refHigh !== null) return `${refLow}–${refHigh}`;
  if (refHigh !== null) return `< ${refHigh}`;
  if (refLow !== null) return `> ${refLow}`;
  return '—';
}

const SCALE_HEIGHT = 12;
const MARKER_SIZE = 14;

const styles = StyleSheet.create({
  scale: { flexDirection: 'row', height: SCALE_HEIGHT },
  zone: { flex: 1, height: SCALE_HEIGHT, borderRadius: radius.full },
  zoneIn: { backgroundColor: theme.color.success.solid },
  marker: {
    position: 'absolute',
    top: -1,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginLeft: -MARKER_SIZE / 2,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: theme.color.text,
    backgroundColor: theme.color.background,
  },
  tiles: { flexDirection: 'row', gap: space.sm },
});
