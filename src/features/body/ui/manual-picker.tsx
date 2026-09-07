import { router } from 'expo-router';

import { useQuery } from '@/core/http/use-query';
import { to } from '@/shared/nav';
import { ActionLink, ListRow, Sheet, Stack, Text } from '@/shared/ui';

import { fetchMetricCatalog } from '../api/body';
import type { Subsystem } from '../api/contract';

/**
 * Что в этой системе можно внести руками. Список берётся из каталога, а не из
 * набора на экране: экран показывает измеренное, а внести можно и то, чего
 * ещё ни разу не измеряли — иначе первый ввод некуда сделать.
 *
 * Сам ввод живёт на экране показателя: там же его пределы, единица и история.
 */
export function ManualPicker({
  subsystem,
  visible,
  onClose,
}: {
  subsystem: Subsystem;
  visible: boolean;
  onClose: () => void;
}) {
  const query = useQuery(visible ? `catalog:${subsystem}` : null, (signal) =>
    fetchMetricCatalog(subsystem, signal),
  );
  const manual = (query.data?.metrics ?? []).filter((metric) => metric.manual.allowed);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a measurement"
      action={<ActionLink label="Cancel" onPress={onClose} />}>
      <Stack gap="sm">
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
              onClose();
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
      </Stack>
    </Sheet>
  );
}
