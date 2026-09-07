import { router } from 'expo-router';

import { to } from '@/shared/nav';
import type { Tone } from '@/shared/theme';
import { ActionLink, Card, ProgressBar, Stack, Tag, Text } from '@/shared/ui';

export type ProtocolCardProps = {
  id: string;
  title: string;
  /** Куда двигаем показатель: «ApoB 1.24 → 0.90». */
  target: string;
  percent: string;
  value: number;
  tone: Extract<Tone, 'success' | 'warning' | 'danger'>;
  /** Строка снизу слева: срок или почему протокол слабое звено. */
  footer: string;
};

/** Карточка протокола или цели — в макете они устроены одинаково. */
export function ProtocolCard({
  id,
  title,
  target,
  percent,
  value,
  tone,
  footer,
}: ProtocolCardProps) {
  return (
    <Card>
      <Stack gap="sm">
        <Stack direction="row" justify="space-between" align="center">
          <Text variant="subtitle">{title}</Text>
          <Tag label={percent} tone={tone} dot />
        </Stack>
        <Text variant="bodySmall" tone="muted">
          {target}
        </Text>
        <ProgressBar value={value} tone={tone} />
        <Stack direction="row" justify="space-between" align="center">
          <Text variant="bodySmall" tone="muted">
            {footer}
          </Text>
          <ActionLink label="Open" chevron onPress={() => router.push(to.protocol(id))} />
        </Stack>
      </Stack>
    </Card>
  );
}
