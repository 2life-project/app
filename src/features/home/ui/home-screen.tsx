import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { theme } from '@/shared/theme';
import { ActionLink, GlassButton, Placeholder, Screen, Segmented, Stack, Text } from '@/shared/ui';

import { HOME_SECTION_NOTE, HOME_SECTIONS, type HomeSection } from '../model/sections';

import { Overview } from './overview';

const HEADER_ACTIONS = [
  { icon: 'watch', label: 'Устройство', href: to.device(), status: true },
  { icon: 'settings', label: 'Настройки', href: to.settings(), status: false },
  { icon: 'edit-2', label: 'Настроить виджеты', href: to.widgets(), status: false },
] as const;

const SECTION_LINK: Partial<Record<HomeSection, { label: string; open: () => void }>> = {
  activity: { label: 'Тренировка', open: () => router.push(to.workout('demo')) },
  nutrition: { label: 'Приём пищи', open: () => router.push(to.meal('demo')) },
  supplements: { label: 'Курс добавок', open: () => router.push(to.course('demo')) },
  wellbeing: { label: 'Чек-ин вечера', open: () => router.push(to.checkIn()) },
};

export function HomeScreen() {
  const [section, setSection] = useState<HomeSection>('overview');
  const link = SECTION_LINK[section];

  return (
    <Screen>
      <Stack gap="lg">
        <Stack direction="row" justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Text variant="display">Monday</Text>
            <Text variant="bodySmall" tone="muted">
              July 13, 2026
            </Text>
            <Stack direction="row" gap="sm" align="center">
              <Text variant="bodySmall" tone="muted">
                Recovery below base
              </Text>
              <ActionLink label="4 decisions wait" onPress={() => router.push(to.journal())} />
            </Stack>
          </Stack>
          <Stack direction="row" gap="sm">
            {HEADER_ACTIONS.map((action) => (
              <GlassButton
                key={action.label}
                size="sm"
                accessibilityLabel={action.label}
                onPress={() => router.push(action.href)}
                // Зелёное кольцо на устройстве — статус связи, а не украшение.
                surfaceStyle={action.status ? styles.connected : undefined}>
                <Feather name={action.icon} size={18} color={theme.color.text} />
              </GlassButton>
            ))}
          </Stack>
        </Stack>

        <Segmented items={HOME_SECTIONS} value={section} onChange={setSection} />

        {section === 'overview' ? (
          <Overview />
        ) : (
          <Placeholder note={HOME_SECTION_NOTE[section]}>
            {link ? <ActionLink label={link.label} chevron onPress={link.open} /> : null}
          </Placeholder>
        )}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  connected: { borderWidth: 2, borderColor: theme.color.success.solid },
});
