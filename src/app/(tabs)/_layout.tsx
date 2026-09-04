import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';

import { fontFamily, size, textVariant, useTheme } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Главная', icon: 'home' },
  { name: 'body', title: 'Тело', icon: 'activity' },
  { name: 'journal', title: 'Журнал', icon: 'calendar' },
  { name: 'more', title: 'Ещё', icon: 'more-horizontal' },
];

/** Новый раздел = файл в этой группе плюс строка в TABS. Больше нигде. */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent.text,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopWidth: size.border,
          borderTopColor: theme.color.border,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.sans,
          fontSize: textVariant.caption.fontSize,
        },
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
