import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { color, fontFamily, textVariant } from '@/shared/theme';

/**
 * Разделы Релиза 1 — по согласованному прототипу мобилки.
 * Новый таб = новый файл в этой группе плюс строка здесь; больше нигде.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textFaint,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color: tint, size }) => <Feather name="home" size={size} color={tint} />,
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Тело',
          tabBarIcon: ({ color: tint, size }) => (
            <Feather name="activity" size={size} color={tint} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Журнал',
          tabBarIcon: ({ color: tint, size }) => (
            <Feather name="calendar" size={size} color={tint} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color: tint, size }) => (
            <Feather name="more-horizontal" size={size} color={tint} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  label: { fontFamily: fontFamily.ui, fontSize: textVariant.caption.fontSize },
});
