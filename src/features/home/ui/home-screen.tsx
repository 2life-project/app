import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { to } from '@/shared/nav';
import { space, theme } from '@/shared/theme';
import { ActionLink, GlassButton, SectionPager, Segmented, Stack, Text } from '@/shared/ui';

import { HOME_SECTIONS, type HomeSection } from '../model/sections';

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

/** Порядок страниц совпадает с порядком чипов — иначе свайп и ряд разойдутся. */
const PAGES = [Overview, Activity, Nutrition, Supplements, Wellbeing] as const;

/** Полоса, в которой контент растворяется под шапкой. */
const FADE = 20;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  // Высоту шапки меряем, а не задаём числом: она зависит от безопасной зоны и
  // от длины строк, и любое подобранное число разъедется на другом устройстве.
  const [headerHeight, setHeaderHeight] = useState(0);
  const section: HomeSection = HOME_SECTIONS[index]?.value ?? 'overview';

  return (
    <LinearGradient colors={theme.color.backdrop} style={styles.fill}>
      <SectionPager
        index={index}
        onIndexChange={setIndex}
        contentTop={Math.max(0, headerHeight - insets.top)}
        pages={PAGES.map((Page, pageIndex) => (
          <Page key={pageIndex} />
        ))}
      />

      {/* Шапка неподвижна: она одинакова во всех разделах, листается только контент. */}
      <View
        pointerEvents="box-none"
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: insets.top }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            theme.color.backdrop[0],
            theme.color.backdrop[0],
            `${theme.color.backdrop[0]}00`,
          ]}
          locations={[0, 0.86, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Stack gap="md">
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

          <Segmented
            items={HOME_SECTIONS}
            value={section}
            onChange={(value) => setIndex(HOME_SECTIONS.findIndex((item) => item.value === value))}
          />
        </Stack>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.screen,
    paddingBottom: FADE,
  },
  connected: { borderWidth: 2, borderColor: theme.color.success.solid },
});
