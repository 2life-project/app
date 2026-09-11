import { useQuery } from '@/core/http/use-query';
import { shortDay } from '@/shared/lib/day';
import {
  Card,
  InfoCard,
  ListRow,
  ProgressBar,
  Screen,
  ScreenHeader,
  Stack,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { TargetProgress } from '../api/contract';
import { fetchProgress, fetchProtocol } from '../api/protocols';
import { ruleSchedule, ruleTitle } from '../model/protocol-view';
import { PROTOCOL_NOTE } from '../model/protocols';
import { directionText } from '../model/target';

export const ProtocolScreenOptions = { headerShown: false };

/**
 * Один протокол: цели с прогрессом и правила. Прогресс считает сервер —
 * против записанной им базы и текущего значения; клиент только показывает.
 */
export function ProtocolScreen({ id }: { id: string }) {
  const bundle = useQuery(`protocol:${id}`, (signal) => fetchProtocol(id, signal));
  const progress = useQuery(`protocol:${id}:progress`, (signal) => fetchProgress(id, signal));
  const protocol = progress.data?.protocol ?? bundle.data?.protocol;
  const targets = progress.data?.targets ?? [];
  const rules = bundle.data?.rules ?? [];

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={protocol?.goal ?? 'Protocol'}
          subtitle={
            protocol
              ? `${protocol.status} · from ${shortDay(protocol.startDate)}${
                  protocol.endDate ? ` until ${shortDay(protocol.endDate)}` : ''
                }`
              : progress.loading
                ? 'loading…'
                : 'did not load'
          }
        />

        {protocol?.aiSummary ? (
          <Card variant="flat">
            <Text tone="muted">{protocol.aiSummary}</Text>
          </Card>
        ) : null}

        <WidgetCard title="Goals" caption={targets.length > 0 ? String(targets.length) : undefined}>
          <Stack gap="md">
            {targets.map((item) => (
              <Goal key={item.target.id} item={item} />
            ))}
            {targets.length === 0 ? (
              <Text tone="muted">
                {progress.loading ? 'Loading the goals…' : 'This protocol has no goals set.'}
              </Text>
            ) : null}
          </Stack>
        </WidgetCard>

        <WidgetCard title="Rules" caption={rules.length > 0 ? String(rules.length) : undefined}>
          <Stack gap="sm">
            {rules.map((rule) => (
              <ListRow
                key={rule.id}
                title={ruleTitle(rule)}
                subtitle={rule.hint ?? ruleSchedule(rule)}
                trailing={rule.domain}
              />
            ))}
            {rules.length === 0 ? (
              <Text tone="muted">{bundle.loading ? 'Loading the rules…' : 'No rules yet.'}</Text>
            ) : null}
          </Stack>
        </WidgetCard>

        <InfoCard title="What a protocol is" text={PROTOCOL_NOTE} />
      </Stack>
    </Screen>
  );
}

/** Цель: куда двигаем показатель, где он сейчас и что делать дальше. */
function Goal({ item }: { item: TargetProgress }) {
  const { target } = item;
  const unit = target.unit ? ` ${target.unit}` : '';
  const now =
    item.currentValue === null
      ? 'no current value'
      : `now ${item.currentValue}${unit}${item.currentDate ? ` · ${shortDay(item.currentDate)}` : ''}`;

  return (
    <Stack gap="xs">
      <ListRow
        title={target.metricKey}
        subtitle={item.validationMessage ?? now}
        trailing={directionText(target)}
        trailingCaption={item.status.replace(/_/g, ' ')}
      />
      <ProgressBar value={Math.min(1, Math.max(0, item.percent / 100))} tone="highlight" />
      <Text variant="bodySmall" tone="muted">
        {item.nextAction}
      </Text>
    </Stack>
  );
}
