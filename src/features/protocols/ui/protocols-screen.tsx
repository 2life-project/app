import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { InfoCard, LinkCard, PagedScreen, Stack } from '@/shared/ui';

import {
  ACTIVE_PROTOCOLS,
  FINISHED_PROTOCOLS,
  GOALS,
  PROTOCOLS_SECTIONS,
  PROTOCOLS_VS_GOALS,
} from '../model/protocols';

import { ProtocolCard, type ProtocolCardProps } from './protocol-card';

function List({ items, action }: { items: readonly ProtocolCardProps[]; action: string }) {
  return (
    <Stack gap="md">
      {items.map((item) => (
        <ProtocolCard key={item.id} {...item} />
      ))}

      <InfoCard
        title="Protocols vs goals"
        text={PROTOCOLS_VS_GOALS}
        link={{ label: 'Learn more', onPress: () => router.push(to.protocol('about')) }}
      />

      <LinkCard label={action} onPress={() => router.push(to.protocol('new'))} />
    </Stack>
  );
}

export function ProtocolsScreen() {
  return (
    <PagedScreen
      title="Protocols"
      subtitle="5 active · 2 finished"
      sections={PROTOCOLS_SECTIONS}
      pages={[
        <List key="active" items={ACTIVE_PROTOCOLS} action="New protocol" />,
        <List key="finished" items={FINISHED_PROTOCOLS} action="New protocol" />,
        <List key="goals" items={GOALS} action="New goal" />,
      ]}
    />
  );
}
