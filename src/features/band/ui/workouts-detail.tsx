import { Card, Stack, Text } from '@/shared/ui';

import type { ActivityState } from '../api';
import type { RecordedWorkout } from '../model/workout-store';

/**
 * Все тренировки за неделю с полями сводки как есть.
 *
 * Полей около полусотни, и раскладка тегов проверена не вся. Показываем их
 * числами под номерами, а не подписываем догадками: выдуманная подпись хуже
 * честного номера — по ней принимают решения, как по измеренному.
 */
export function WorkoutsDetail({
  recorded,
  states,
}: {
  recorded: readonly RecordedWorkout[];
  states: readonly ActivityState[];
}) {
  if (recorded.length === 0 && states.length === 0) {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="subtitle">Ничего не размечено</Text>
          <Text tone="muted">
            Браслет размечает заходы движения сам, без кнопки старта. За последние сутки он не
            распознал ни одного.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {states.length === 0 ? null : (
        <Card variant="sunken">
          <Stack gap="sm">
            <Text variant="subtitle">Распознанные заходы</Text>
            {/* Вид движения прошивка не различает: во всех наблюдениях тип
                равен единице. Подписывать его словом значит выдумывать. */}
            {states.map((item) => (
              <Stack
                key={`${item.stream}-${item.at.getTime()}`}
                direction="row"
                justify="space-between">
                <Text variant="bodySmall">{item.at.toLocaleString()}</Text>
                <Text variant="bodySmall" tone="muted">
                  {item.minutes} мин · поток {item.stream}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

      {recorded.length === 0 ? null : (
        <Card variant="sunken">
          <Stack gap="sm">
            <Text variant="subtitle">Тренировки</Text>
            {/* Хранятся на телефоне: браслет их не сохраняет. */}
            {[...recorded].reverse().map((item) => (
              <Stack key={item.startedAt} direction="row" justify="space-between">
                <Text variant="bodySmall">{new Date(item.startedAt).toLocaleString()}</Text>
                <Text variant="bodySmall" tone="muted">
                  {Math.round(item.seconds / 60)} мин · {item.distance} м · {item.calories} ккал
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
