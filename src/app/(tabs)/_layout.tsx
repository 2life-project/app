import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { fontFamily, size, textVariant, theme } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Главная', icon: 'home' },
  { name: 'body', title: 'Тело', icon: 'activity' },
  { name: 'journal', title: 'Журнал', icon: 'calendar' },
  { name: 'more', title: 'Ещё', icon: 'more-horizontal' },
];

/** Новый раздел = файл в этой группе плюс строка в TABS. Больше нигде. */
export default function TabsLayout() {
  return (
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
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.color.surface,
    borderTopWidth: size.border,
    borderTopColor: theme.color.border,
  },
  // Роль текста берётся целиком: кегль без интерлиньяжа и начертания — половина токена.
  label: { fontFamily: fontFamily.sans, ...textVariant.caption },
});
