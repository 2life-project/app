import { Card, EmptyPanel, Screen, ScreenHeader, Stack, Text } from '@/shared/ui';

import { RECORDS_INTRO } from '../model/records';

export const RecordsIntroScreenOptions = { headerShown: false };

/** Медкарта до первого документа: не пустой экран, а объяснение начала. */
export function RecordsIntroScreen() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={RECORDS_INTRO.title} subtitle={RECORDS_INTRO.subtitle} />

        <Card variant="sunken">
          <Text tone="muted">{RECORDS_INTRO.search}</Text>
        </Card>

        <EmptyPanel
          icon="file-text"
          title={RECORDS_INTRO.empty.title}
          text={RECORDS_INTRO.empty.text}
        />

        <Card variant="flat">
          <Text variant="bodySmall" tone="muted">
            {RECORDS_INTRO.action}
          </Text>
        </Card>
      </Stack>
    </Screen>
  );
}
