import Feather from '@expo/vector-icons/Feather';
import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { to } from '@/shared/nav';
import { fontFamily, radius, size, space, textVariant, theme } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

/** Пять разделов из макета. Новый раздел = файл в группе плюс строка здесь. */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Главная', icon: 'home' },
  { name: 'journal', title: 'Журнал', icon: 'calendar' },
  { name: 'body', title: 'Тело', icon: 'activity' },
  { name: 'records', title: 'Медкарта', icon: 'file-text' },
  { name: 'protocols', title: 'Протоколы', icon: 'target' },
];

export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.color.accent.text,
          tabBarInactiveTintColor: theme.color.textMuted,
          tabBarStyle: styles.bar,
          tabBarLabelStyle: styles.label,
        }}>
        {TABS.map(({ name, title, icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color, size: iconSize }) => (
                <Feather name={icon} size={iconSize} color={color} />
              ),
            }}
          />
        ))}
      </Tabs>

      {/* Ассистент доступен с любого раздела — в макете это кружок над таббаром. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ассистент"
        onPress={() => router.push(to.assistant())}
        style={styles.assistant}>
        <Feather name="message-circle" size={size.icon.lg} color={theme.color.accent.on} />
      </Pressable>
    </>
  );
}

const ASSISTANT_SIZE = 56;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.color.surface,
    borderTopWidth: size.border,
    borderTopColor: theme.color.border,
  },
  label: { fontFamily: fontFamily.sans, ...textVariant.caption },
  assistant: {
    position: 'absolute',
    right: space.lg,
    bottom: 96,
    width: ASSISTANT_SIZE,
    height: ASSISTANT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.accent.solid,
    boxShadow: theme.elevation.medium,
  },
});
