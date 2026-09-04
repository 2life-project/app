import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { theme } from '@/shared/theme';
import { ActionLink, GlassButton, PagedScreen, Stack, Text } from '@/shared/ui';

import { HOME_SECTIONS } from '../model/sections';

import { Activity } from './activity';
import { Nutrition } from './nutrition';
import { Overview } from './overview';
import { Supplements } from './supplements';
import { Wellbeing } from './wellbeing';

const HEADER_ACTIONS = [
  { icon: 'watch', label: 'Устройство', href: to.device(), status: true },
  { icon: 'settings', label: 'Настройки', href: to.settings(), status: false },
  { icon: 'edit-2', label: 'Настроить виджеты', href: to.widgets(), status: false },
] as const;

export function HomeScreen() {
  return (
    <PagedScreen
      sections={HOME_SECTIONS}
      header={
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
      }
      pages={[
        <Overview key="o" />,
        <Activity key="a" />,
        <Nutrition key="n" />,
        <Supplements key="s" />,
        <Wellbeing key="w" />,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  connected: { borderWidth: 2, borderColor: theme.color.success.solid },
});
