import { Button, Card, Screen, Stack, Tag, Text } from '@/shared/ui';

import { greetingFor } from '../model/greeting';

export function HomeScreen() {
  return (
    <Screen>
      <Stack gap="xl">
        <Stack gap="xxs">
          <Text variant="caption" tone="faint">
            {greetingFor(new Date()).toUpperCase()}
          </Text>
          <Text variant="display">Картина</Text>
        </Stack>

        <Card>
          <Stack gap="md">
            <Tag label="Данных пока нет" />
            <Text variant="subtitle">Загрузите первый анализ</Text>
            <Text tone="soft">
              Соберём показатели в одну картину и покажем, что из этого важно.
            </Text>
            <Button label="Сфотографировать или выбрать" />
          </Stack>
        </Card>

        <Stack gap="md">
          <Text variant="label" tone="faint">
            ЗА 7 ДНЕЙ
          </Text>
          <Card tone="glass">
            <Stack direction="row" justify="space-between" align="center">
              <Stack gap="xxs">
                <Text variant="metric">—</Text>
                <Text variant="caption" tone="faint">
                  показателей обновилось
                </Text>
              </Stack>
              <Tag label="ждём данные" tone="watch" />
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </Screen>
  );
}
