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
} from '@/shared/ui';

import type { Target } from '../api/contract';
import { fetchTargets } from '../api/protocols';
import { PROTOCOL_NOTE } from '../model/protocols';
import { directionText, isOpen } from '../model/target';

export const ProtocolScreenOptions = { headerShown: false };

/**
 * Один протокол — его цели. Сам протокол сервер в спеке не описывает, а цели
 * описаны полностью, и показываем именно их: выдумывать протоколу поля ради
 * заполненного экрана значит показать человеку то, чего сервер не говорил.
 */
export function ProtocolScreen({ id }: { id: string }) {
  const query = useQuery(`protocol:${id}`, (signal) => fetchTargets(id, signal));
  const targets = query.data?.targets ?? [];
  const open = targets.filter(isOpen);

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Protocol"
          subtitle={
            query.data ? `${open.length} of ${targets.length} goals in progress` : 'loading…'
          }
        />

        {targets.length === 0 ? (
          <Card variant="sunken">
            <Text tone="muted">
              {query.loading ? 'Loading the goals…' : 'This protocol has no goals set.'}
            </Text>
          </Card>
        ) : (
          <Card>
            <Stack gap="md">
              {targets.map((target) => (
                <Goal key={target.id} target={target} />
              ))}
            </Stack>
          </Card>
        )}

        <InfoCard title="What a protocol is" text={PROTOCOL_NOTE} />
      </Stack>
    </Screen>
  );
}

/**
 * Цель: куда двигаем показатель и от чего считаем. Прогресс не рисуем —
 * текущего значения показателя эта ручка не отдаёт, а брать его из другого
 * места значит сравнить числа за разные дни.
 */
function Goal({ target }: { target: Target }) {
  const base =
    target.baselineValue === null
      ? 'no baseline yet'
      : `from ${target.baselineValue}${target.unit ? ` ${target.unit}` : ''}${
          target.baselineDate ? ` · ${shortDay(target.baselineDate)}` : ''
        }`;

  return (
    <Stack gap="xs">
      <ListRow
        title={target.metricKey}
        subtitle={base}
        trailing={directionText(target)}
        trailingCaption={target.targetDate ? shortDay(target.targetDate) : undefined}
      />
      <ProgressBar value={0} tone="highlight" />
    </Stack>
  );
}
