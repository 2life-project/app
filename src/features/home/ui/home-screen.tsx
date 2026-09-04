import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import { Button, Placeholder, Screen, Segmented, Stack, Text } from '@/shared/ui';

import { greetingFor, HOME_SECTION_NOTE, HOME_SECTIONS, type HomeSection } from '../model/sections';

const HEADER_ACTIONS = [
  { icon: 'watch', label: 'Браслет', href: to.device() },
  { icon: 'settings', label: 'Настройки', href: to.settings() },
  { icon: 'edit-2', label: 'Настроить виджеты', href: to.widgets() },
] as const;

export function HomeScreen() {
  const [section, setSection] = useState<HomeSection>('overview');

  return (
    <Screen>
      <Stack gap="lg">
        <Stack direction="row" justify="space-between" align="center">
          <Stack gap="xs">
            <Text variant="caption" tone="muted">
              {greetingFor(new Date()).toUpperCase()}
            </Text>
            <Text variant="display">Главная</Text>
          </Stack>
          <Stack direction="row" gap="xs">
            {HEADER_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => router.push(action.href)}
                style={styles.action}>
                <Feather name={action.icon} size={size.icon.md} color={theme.color.textMuted} />
              </Pressable>
            ))}
          </Stack>
        </Stack>

        <Segmented items={HOME_SECTIONS} value={section} onChange={setSection} />

        <Placeholder note={HOME_SECTION_NOTE[section]}>
          {section === 'overview' ? (
            <Button label="Журнал" variant="tonal" onPress={() => router.push(to.journal())} />
          ) : null}
          {section === 'activity' ? (
            <Button
              label="Тренировка"
              variant="tonal"
              onPress={() => router.push(to.workout('demo'))}
            />
          ) : null}
          {section === 'nutrition' ? (
            <Button
              label="Приём пищи"
              variant="tonal"
              onPress={() => router.push(to.meal('demo'))}
            />
          ) : null}
          {section === 'supplements' ? (
            <Button
              label="Курс добавок"
              variant="tonal"
              onPress={() => router.push(to.course('demo'))}
            />
          ) : null}
          {section === 'wellbeing' ? (
            <Button
              label="Чек-ин вечера"
              variant="tonal"
              onPress={() => router.push(to.checkIn())}
            />
          ) : null}
        </Placeholder>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    width: size.tapTarget,
    height: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.surface,
    marginLeft: space.none,
  },
});
