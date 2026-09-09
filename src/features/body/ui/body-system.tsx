import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import { readingsNote, useBandReadings, vitalsOf, type Vital } from '@/shared/domain';
import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  ActionLink,
  Button,
  EmptyPanel,
  BarChart,
  Card,
  DatePager,
  InfoCard,
  LineChart,
  LinkCard,
  ListRow,
  RadioRow,
  SectionCaption,
  SectionSummary,
  Sheet,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { fetchSubsystem, saveRingMetric, subsystemKey } from '../api/body';
import type { Subsystem } from '../api/contract';
import { RING_NOTE, subsystemView } from '../model/subsystem';
import { bandGroupOf, NO_DATA } from '../model/systems';

/**
 * Единый шаблон системы тела. В макете четыре системы отличаются только
 * содержимым, поэтому разметка одна: расхождения между ними были бы багом.
 * Содержимое теперь целиком с сервера — включая то, какой показатель стоит
 * в кольце и какие ещё можно туда поставить.
 */
export function BodySystem({
  section,
  date,
  timeZone,
  fallback,
}: {
  section: Subsystem;
  date: string;
  timeZone: string;
  /** Что показать, пока данных нет: загрузка или ошибка раздела. */
  fallback: React.ReactNode;
}) {
  const query = useQuery(subsystemKey(section, date, timeZone), (signal) =>
    fetchSubsystem(section, date, timeZone, signal),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  // Показания браслета за тот же день. Они лежат на телефоне и от сети не
  // зависят: сервер молчит — они всё равно есть.
  const band = useBandReadings(date);
  const group = bandGroupOf(section);
  const vitals = group === null ? [] : vitalsOf(band, group);

  const data = query.data;
  if (!data) {
    // Сервер не ответил, но рука мерила. Показать «загружается» поверх готовых
    // чисел значит спрятать единственное, что у человека сейчас есть.
    return vitals.length > 0 ? (
      <Stack gap="md">
        <BandVitals note={readingsNote(band)} vitals={vitals} />
        {fallback}
      </Stack>
    ) : (
      <Stack gap="md">{fallback}</Stack>
    );
  }

  const view = subsystemView(data);
  // Пусто — это когда ни у одного показателя системы нет значения. Рисовать
  // при этом кольца и плитки с прочерками значит показывать пустую форму
  // вместо ответа, есть ли вообще данные.
  const empty = data.metrics.every((metric) => metric.value === null);

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(data.date)}`} />

      {failed ? (
        <Card variant="sunken">
          <Text tone="danger">The ring metric did not save. Try again.</Text>
        </Card>
      ) : null}

      {vitals.length > 0 ? <BandVitals note={readingsNote(band)} vitals={vitals} /> : null}

      {empty && vitals.length === 0 ? (
        <>
          <EmptyPanel icon="watch" title={NO_DATA.title} text={NO_DATA.text} />
          <Button label={NO_DATA.connect} onPress={() => router.push(to.device())} />
          <ActionLink label={NO_DATA.manual} onPress={() => router.push(to.measure(section))} />
        </>
      ) : null}

      {empty ? null : (
        <>
          <SectionSummary
            title={view.title}
            action={
              data.ring.configurable
                ? { label: 'Change', chevron: true, onPress: () => setPickerOpen(true) }
                : { label: 'Body', chevron: true, onPress: () => router.push(to.body()) }
            }
            caption={<SectionCaption>{view.caption}</SectionCaption>}
            ring={view.ring}
            rows={view.rows.map((row) => ({
              ...row,
              onPress: () => router.push(to.metric(row.id)),
            }))}
          />

          {view.tiles.length > 0 ? (
            <Card>
              <View style={styles.tiles}>
                {view.tiles.map((tile) => (
                  <StatTile key={tile.label} {...tile} />
                ))}
              </View>
            </Card>
          ) : null}

          {view.charts.map((chart, index) => (
            <WidgetCard key={chart.id} title={chart.title} caption={chart.caption}>
              {index === 0 ? (
                <BarChart values={chart.values} highlightIndex={chart.values.length - 1} />
              ) : (
                <LineChart values={chart.values} />
              )}
            </WidgetCard>
          ))}

          {/* Биохимия ведётся отдельным процессом — подсистема только показывает,
          где её искать, и не делает вид, что ведёт её сама. */}
          {data.medicalData.suggestedKeys.length > 0 ? (
            <InfoCard
              title="Lab markers for this system"
              text={`${data.medicalData.suggestedKeys.join(', ')} — they come from documents, not from the band, and live in the medical card.`}
              link={{ label: 'Medical card', onPress: () => router.push(to.records()) }}
            />
          ) : null}

          <LinkCard label="More charts" onPress={() => router.push(to.metric(data.ring.metric))} />
          <LinkCard
            label="Add a measurement by hand"
            onPress={() => router.push(to.measure(section))}
          />
        </>
      )}

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Track in the ring"
        action={<ActionLink label="Done" onPress={() => setPickerOpen(false)} />}>
        <Stack gap="md">
          {view.options.map((option) => (
            <RadioRow
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={option.id === data.preferences.ringMetric}
              onPress={() => {
                setPickerOpen(false);
                setFailed(false);
                saveRingMetric(data.preferences, option.id).then(
                  () => query.refresh(),
                  (failure: unknown) => {
                    // Сервер принимает настройку только против той ревизии,
                    // которую видел клиент: отказ здесь обычное дело, и
                    // молчать о нём нельзя — кольцо просто вернётся назад.
                    logger.error('Показатель кольца не сохранился', { failure });
                    setFailed(true);
                  },
                );
              }}
            />
          ))}
          <Text variant="bodySmall" tone="muted">
            {RING_NOTE}
          </Text>
        </Stack>
      </Sheet>
    </Stack>
  );
}

/** Что браслет измерил сам по этой системе. Источник подписан: рядом стоят числа сервера. */
function BandVitals({ note, vitals }: { note: string | null; vitals: readonly Vital[] }) {
  return (
    <Stack gap="sm">
      <SectionCaption>{(note ?? 'from your band').toUpperCase()}</SectionCaption>
      <Card>
        <Stack gap="xs">
          {vitals.map((vital) => (
            <ListRow
              key={vital.id}
              title={vital.title}
              subtitle={vital.note}
              trailing={vital.value}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
});
