import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { signOut, useSession } from '@/core/auth';
import { useQuery } from '@/core/http/use-query';
import {
  clearBandReadings,
  clearBodyProfile,
  setPairedBand,
  useBandReadings,
  usePairedBand,
} from '@/shared/domain';
import { useToday } from '@/shared/lib/day';
import { clearStore, usePersistentState } from '@/shared/lib/store';
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

import { fetchProfile } from '../api/settings';
import { displayName, initials, memberSince } from '../model/profile';
import {
  ADD_DEVICE,
  bandRow,
  RESET,
  RESET_CONFIRM,
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
  const session = useSession();
  const profile = useQuery('profile', (signal) => fetchProfile(signal));
  const [choice, setChoice] = useState<string | null>(null);
  const [picked, setPicked] = usePersistentState<Record<string, string>>('settings', {});
  const [confirm, setConfirm] = useState<string | null>(null);

  // Свой браслет — живой строкой поверх макетного списка: его состояние
  // приложение знает точно, в отличие от остальных источников.
  const { date } = useToday();
  const band = bandRow(usePairedBand(), useBandReadings(date));

  const open = (row: SettingsRow) => {
    if (row.opens === 'device') router.push(to.device());
    else if (row.opens === 'records') router.push(to.recordsIntro());
    else if (row.opens === 'confirm') setConfirm(row.id);
    else if (row.opens === 'choice') setChoice(row.id);
  };

  const sheet = choice ? SETTINGS_CHOICES[choice] : undefined;
  const user = session.status === 'signed' ? session.user : null;
  const name = displayName(profile.data?.profile ?? null, user);
  const since = memberSince(profile.data?.profile ?? null);
  /** Статус подписки приходит в самом ключе доступа — отдельной ручки нет. */
  const plan = user?.subscriptionStatus === 'active' ? PROFILE.plan : null;

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
                {initials(name)}
              </Text>
            </View>
            <View style={styles.identity}>
              <Text variant="subtitle">{name}</Text>
              {/* Дату показываем только у заполненного профиля: у пустого
                  сервер отдаёт значения по умолчанию, и она ничего не значит. */}
              <Text variant="bodySmall" tone="muted">
                {since ? `with 2Life since ${since}` : (user?.username ?? '')}
              </Text>
            </View>
            {plan ? <Tag label={plan} tone="accent" /> : null}
          </View>
        </Card>

        <Section
          caption="DEVICES"
          rows={band ? [band, ...DEVICES, ADD_DEVICE] : [...DEVICES, ADD_DEVICE]}
          onOpen={open}
        />
        <Section caption="APP" rows={APP_ROWS} onOpen={open} />
        <Section caption="DATA" rows={DATA_ROWS} onOpen={open} />
        <Section caption="ACCOUNT" rows={[SIGN_OUT, RESET]} onOpen={open} />

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
                // Экран есть только у своего браслета: чужой трекер
                // подключается в приложении его производителя, а не у нас.
                if (choice === 'add' && option.id === 'band') {
                  setChoice(null);
                  router.push(to.device());
                  return;
                }
                setPicked({ ...picked, [choice ?? '']: option.id });
              }}
            />
          ))}
        </Stack>
      </Sheet>

      <Sheet
        visible={confirm === 'sign-out'}
        onClose={() => setConfirm(null)}
        title={SIGN_OUT_CONFIRM.title}
        action={<ActionLink label="Cancel" onPress={() => setConfirm(null)} />}>
        <Stack gap="md">
          <Text tone="muted">{SIGN_OUT_CONFIRM.text}</Text>
          <Button
            label="Sign out"
            tone="danger"
            onPress={() => {
              setConfirm(null);
              void signOut();
            }}
          />
        </Stack>
      </Sheet>

      {/* Единственный способ вернуться к первому запуску: макет помнит всё,
          что человек нажал, и без сброса краевые состояния уже не увидеть. */}
      <Sheet
        visible={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title={RESET_CONFIRM.title}
        action={<ActionLink label="Cancel" onPress={() => setConfirm(null)} />}>
        <Stack gap="md">
          <Text tone="muted">{RESET_CONFIRM.text}</Text>
          <Button
            label="Reset"
            tone="warning"
            onPress={() => {
              // Диск чистит `clearStore` по общему префиксу, но доменные
              // сущности живут ещё и в памяти: без этих вызовов экраны
              // показывали бы стёртые профиль и показания до перезапуска.
              void clearStore().then(() => {
                setPairedBand(null);
                clearBodyProfile();
                clearBandReadings();
              });
              setConfirm(null);
            }}
          />
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
