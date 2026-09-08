import { router } from 'expo-router';

import { useQuery } from '@/core/http/use-query';
import { to } from '@/shared/nav';
import { Card, InfoCard, ListRow, PagedScreen, Stack, Text } from '@/shared/ui';

import type { ProtocolBundle } from '../api/contract';
import { fetchProtocols } from '../api/protocols';
import {
  isFinished,
  protocolId,
  protocolParts,
  protocolTitle,
  protocolStatus,
} from '../model/protocol-view';
import { PROTOCOLS_SECTIONS, PROTOCOLS_VS_GOALS } from '../model/protocols';

/**
 * Протоколы с сервера. Сам объект протокола сервер в спеке не описывает,
 * поэтому его поля читаются проверкой — см. `protocol-view`. Состав протокола
 * (правила, цели, рекомендации) описан, и число в подписи настоящее.
 */
export function ProtocolsScreen() {
  const query = useQuery('protocols', (signal) => fetchProtocols(signal));
  const all = query.data?.protocols ?? [];
  const active = all.filter((bundle) => !isFinished(bundle));
  const finished = all.filter(isFinished);
  const withTargets = all.filter((bundle) => bundle.targets.length > 0);

  return (
    <PagedScreen
      title="Protocols"
      subtitle={query.data ? `${active.length} active · ${finished.length} finished` : 'loading…'}
      sections={PROTOCOLS_SECTIONS}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      pages={[
        <List key="active" items={active} empty={EMPTY.active} loading={query.loading} />,
        <List key="finished" items={finished} empty={EMPTY.finished} loading={query.loading} />,
        <List key="goals" items={withTargets} empty={EMPTY.goals} loading={query.loading} goals />,
      ]}
    />
  );
}

const EMPTY = {
  active: 'No protocols running right now.',
  finished: 'Nothing finished yet.',
  goals: 'No goals set — they live inside a protocol.',
} as const;

function List({
  items,
  empty,
  loading,
  goals = false,
}: {
  items: readonly ProtocolBundle[];
  empty: string;
  loading: boolean;
  /** На вкладке целей в подписи стоит их число, а не состав протокола. */
  goals?: boolean;
}) {
  return (
    <Stack gap="md">
      {items.length === 0 ? (
        <Card variant="sunken">
          <Text tone="muted">{loading ? 'Loading protocols…' : empty}</Text>
        </Card>
      ) : (
        <Card>
          <Stack gap="sm">
            {items.map((bundle) => (
              <ListRow
                key={protocolId(bundle) || protocolTitle(bundle)}
                title={protocolTitle(bundle)}
                subtitle={goals ? `${bundle.targets.length} targets` : protocolParts(bundle)}
                trailing={protocolStatus(bundle) ?? undefined}
                onPress={() => router.push(to.protocol(protocolId(bundle)))}
              />
            ))}
          </Stack>
        </Card>
      )}

      <InfoCard title="Protocols vs goals" text={PROTOCOLS_VS_GOALS} />
    </Stack>
  );
}
