import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePersistentState } from '@/shared/lib/store';
import { to } from '@/shared/nav';
import { radius, space, theme } from '@/shared/theme';
import {
  ActionLink,
  BackButton,
  Button,
  Card,
  IconTile,
  ListRow,
  Screen,
  RadioRow,
  SectionCaption,
  Sheet,
  Stack,
  Tag,
  Text,
} from '@/shared/ui';

import {
  ADD_DEVICE,
  SETTINGS_CHOICES,
  SIGN_OUT_CONFIRM,
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
/** Шапки нет: заголовок стоит в содержимом, как в макете, возврат — кнопкой. */
export const SettingsScreenOptions = { headerShown: false };

/** Настройки: профиль, источники данных, приложение, данные, аккаунт. */
export function SettingsScreen() {
  const [choice, setChoice] = useState<string | null>(null);
  const [picked, setPicked] = usePersistentState<Record<string, string>>('settings', {});
  const [signOut, setSignOut] = useState(false);

  const open = (row: SettingsRow) => {
    if (row.opens === 'device') router.push(to.device(row.id));
    else if (row.opens === 'records') router.push(to.recordsIntro());
    else if (row.opens === 'confirm') setSignOut(true);
    else if (row.opens === 'choice') setChoice(row.id);
  };

  const sheet = choice ? SETTINGS_CHOICES[choice] : undefined;

  return (
    <Screen>
      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center">
          <BackButton />
          <Text variant="display">Settings</Text>
        </Stack>

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

        <Section caption="DEVICES" rows={[...DEVICES, ADD_DEVICE]} onOpen={open} />
        <Section caption="APP" rows={APP_ROWS} onOpen={open} />
        <Section caption="DATA" rows={DATA_ROWS} onOpen={open} />
        <Section caption="ACCOUNT" rows={[SIGN_OUT]} onOpen={open} />

        <Text variant="footnote" tone="muted" style={styles.version}>
          {VERSION}
        </Text>
      </Stack>

      <Sheet
        visible={sheet !== undefined}
        onClose={() => setChoice(null)}
        title={sheet?.title ?? ''}
        action={<ActionLink label="Done" onPress={() => setChoice(null)} />}>
        <Stack gap="md">
          {sheet?.options.map((option) => (
            <RadioRow
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              selected={(picked[choice ?? ''] ?? sheet.options[0]?.id) === option.id}
              onPress={() => {
                if (choice === 'add') {
                  setChoice(null);
                  router.push(to.device(option.id));
                  return;
                }
                setPicked({ ...picked, [choice ?? '']: option.id });
              }}
            />
          ))}
        </Stack>
      </Sheet>

      <Sheet
        visible={signOut}
        onClose={() => setSignOut(false)}
        title={SIGN_OUT_CONFIRM.title}
        action={<ActionLink label="Cancel" onPress={() => setSignOut(false)} />}>
        <Stack gap="md">
          <Text tone="muted">{SIGN_OUT_CONFIRM.text}</Text>
          <Button label="Sign out" tone="danger" onPress={() => setSignOut(false)} />
        </Stack>
      </Sheet>
    </Screen>
  );
}

function Section({
  caption,
  rows,
  onOpen,
}: {
  caption: string;
  rows: readonly SettingsRow[];
  onOpen: (row: SettingsRow) => void;
}) {
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
              onPress={row.opens ? () => onOpen(row) : undefined}
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
