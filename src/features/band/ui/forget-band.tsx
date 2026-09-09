import { useState } from 'react';

import { Button, Card, Stack, Text } from '@/shared/ui';

/**
 * Отвязать браслет — с подтверждением, потому что это необратимо.
 *
 * Кнопка стояла рядом с «подключить» и срабатывала с одного нажатия, хотя
 * стирает архив суток, который взять больше неоткуда: устройство хранит около
 * четырёх дней, а всё, что глубже, есть только на этом телефоне.
 *
 * Подтверждение называет, что именно исчезнет и что останется. «Вы уверены?»
 * на этот вопрос не отвечает.
 */
export function ForgetBand({ onForget }: { onForget: () => void }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return <Button label="Forget this band" variant="plain" onPress={() => setAsking(true)} />;
  }

  return (
    <Card variant="sunken">
      <Stack gap="md">
        <Text variant="subtitle">Forget this band?</Text>
        <Text tone="muted">
          Unpairs it from this phone and wipes the days kept here. The band stores about four days
          itself — anything older exists only on this phone and cannot be read back. Voice
          recordings already downloaded stay.
        </Text>
        <Button label="Forget the band" tone="danger" onPress={onForget} />
        <Button label="Keep it" variant="plain" onPress={() => setAsking(false)} />
      </Stack>
    </Card>
  );
}
