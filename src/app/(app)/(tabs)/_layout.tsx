import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { fontFamily, radius, space, textVariant, theme } from '@/shared/theme';
import { Glass, supportsLiquidGlass } from '@/shared/ui';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Пять разделов из макета. Новый раздел — файл в этой группе плюс строка здесь.
 * Символ нужен нативному таббару, иконка — запасному.
 */
const TABS: { name: string; title: string; symbol: SFSymbol; icon: FeatherName }[] = [
  { name: 'index', title: 'Home', symbol: 'house.fill', icon: 'home' },
  { name: 'journal', title: 'Journal', symbol: 'calendar', icon: 'calendar' },
  { name: 'body', title: 'Body', symbol: 'waveform.path.ecg', icon: 'activity' },
  { name: 'records', title: 'Records', symbol: 'doc.text.fill', icon: 'file-text' },
  { name: 'protocols', title: 'Protocols', symbol: 'target', icon: 'target' },
];

/**
 * Таббар живёт в двух видах, и выбор делается один раз здесь:
 *
 * - iOS 26 — нативный `UITabBar` со стеклом системы. Он сам размывает контент
 *   под собой, сам прячется при скролле и ведёт себя как во всех приложениях
 *   платформы; повторить это в JS нельзя;
 * - остальные — своя панель на том же примитиве стекла, что и кнопки.
 */
export default function TabsLayout() {
  return supportsLiquidGlass ? <NativeTabBar /> : <GlassTabBar />;
}

function NativeTabBar() {
  return (
    <NativeTabs
      tintColor={theme.color.accent.text}
      iconColor={theme.color.textMuted}
      // Панель остаётся стеклянной и когда список доскроллен до края: иначе
      // система подменяет её непрозрачной и таббар «моргает» цветом.
      disableTransparentOnScrollEdge={false}
      blurEffect="systemChromeMaterial">
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={tab.symbol} />
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function GlassTabBar() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent.text,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarBackground: () => <Glass style={StyleSheet.absoluteFill} />,
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size: iconSize }) => (
              <Feather name={tab.icon} size={iconSize} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

/** Панель приподнята над краем — так же, как нативная в iOS 26. */
const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    height: 64,
    borderTopWidth: 0,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: 'transparent',
    boxShadow: theme.elevation.medium,
    overflow: 'hidden',
  },
  label: { fontFamily: fontFamily.sans, ...textVariant.caption },
});
