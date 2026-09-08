import { router } from 'expo-router';

import { useQuery } from '@/core/http/use-query';
import { to } from '@/shared/nav';
import { ActionLink, ListRow, SheetBody, Text } from '@/shared/ui';

import { fetchMetricCatalog } from '../api/body';
import type { Subsystem } from '../api/contract';

/**
 * Что в этой системе можно внести руками. Список берётся из каталога, а не из
 * набора на экране: внести можно и то, чего ещё ни разу не измеряли, — иначе
 * первый ввод некуда сделать.
 *
 * Сам ввод живёт на экране показателя: там его пределы, единица и история.
 */
export function MeasureScreen({ subsystem }: { subsystem: string }) {
  const query = useQuery(`catalog:${subsystem}`, (signal) =>
    fetchMetricCatalog(subsystem as Subsystem, signal),
  );
  const manual = (query.data?.metrics ?? []).filter((metric) => metric.manual.allowed);

  return (
    <SheetBody
      title="Add a measurement"
      action={<ActionLink label="Cancel" onPress={() => router.back()} />}>
      {manual.map((metric) => (
        <ListRow
          key={metric.key}
          title={metric.name}
          subtitle={
            metric.automatic.readSupported
              ? `${metric.manual.unit} · also read from a device`
              : `${metric.manual.unit} · by hand only`
          }
          onPress={() => {
            router.back();
            router.push(to.metric(metric.key));
          }}
        />
      ))}
      {manual.length === 0 ? (
        <Text tone="muted">
          {query.loading
            ? 'Loading the catalog…'
            : 'Nothing in this system is entered by hand — it all comes from a device.'}
        </Text>
      ) : null}
    </SheetBody>
  );
}
