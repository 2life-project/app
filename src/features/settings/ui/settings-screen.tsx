import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';
import { Card, IconTile, ListRow, Screen, SectionCaption, Stack, Tag, Text } from '@/shared/ui';

import {
  ADD_DEVICE,
  APP_ROWS,
  DATA_ROWS,
  DEVICES,
  PROFILE,
  SIGN_OUT,
  VERSION,
  type SettingsRow,
} from '../model/settings';

/**
 * Заголовок экрана стоит в содержимом, как в макете, поэтому в шапке остаётся
 * только возврат. Сама шапка прозрачна: под ней должен идти тот же градиент.
 */
export const SettingsScreenOptions = {
  title: '',
  headerTransparent: true,
  // Прозрачной шапке нужен и прозрачный фон: цвет из общих настроек шапки
  // иначе закрашивает градиент белой полосой.
  headerStyle: { backgroundColor: 'transparent' },
};

/** Настройки: профиль, источники данных, приложение, данные, аккаунт. */
export function SettingsScreen() {
  return (
    <Screen>
      <Stack gap="lg">
        <Text variant="display">Settings</Text>

        <Card>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text variant="subtitle" tone="onHighlight">
                {PROFILE.initials}
              </Text>
            </View>
            <View style={styles.identity}>
              <Text variant="subtitle">{PROFILE.name}</Text>
              <Text variant="bodySmall" tone="muted">
                {PROFILE.since}
              </Text>
            </View>
            <Tag label={PROFILE.plan} tone="accent" />
          </View>
        </Card>

        <Section caption="DEVICES" rows={[...DEVICES, ADD_DEVICE]} />
        <Section caption="APP" rows={APP_ROWS} />
        <Section caption="DATA" rows={DATA_ROWS} />
        <Section caption="ACCOUNT" rows={[SIGN_OUT]} />

        <Text variant="footnote" tone="muted" style={styles.version}>
          {VERSION}
        </Text>
      </Stack>
    </Screen>
  );
}

function Section({ caption, rows }: { caption: string; rows: readonly SettingsRow[] }) {
  return (
    <Stack gap="sm">
      <SectionCaption>{caption}</SectionCaption>
      <Card>
        <Stack gap="xs">
          {rows.map((row) => (
            <ListRow
              key={row.id}
              leading={<IconTile name={row.icon} tone={row.tone} size={ICON_TILE} />}
              title={row.title}
              titleTone={row.titleTone}
              subtitle={row.subtitle}
              trailing={row.value}
              trailingSlot={row.connected ? <View style={styles.dot} /> : undefined}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const AVATAR = 52;
const ICON_TILE = 32;
const DOT = 7;

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.highlight.solid,
  },
  identity: { flex: 1 },
  // Точка связи — состояние источника, а не его тип: цвет здесь значит «на связи».
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: theme.color.success.solid,
  },
  version: { textAlign: 'center' },
});
