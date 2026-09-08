import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

type IconName = keyof typeof Feather.glyphMap;

export type ActionTileProps = {
  icon: IconName;
  title: string;
  /** Что именно делает способ ввода: «со снимка тарелки», «сканом упаковки». */
  subtitle?: string;
  onPress?: () => void;
};

/** Плитка способа ввода: иконка, название, пояснение. Стоят рядом по три. */
export function ActionTile({ icon, title, subtitle, onPress }: ActionTileProps) {
  return (
    <Pressable style={styles.tile} accessibilityLabel={title} onPress={onPress}>
      <View style={styles.badge}>
        <Feather name={icon} size={size.icon.lg} color={theme.color.accent.text} />
      </View>
      <Text variant="body">{title}</Text>
      {subtitle ? (
        <Text variant="footnote" tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const BADGE = 40;

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.color.surfaceInner,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.accent.surface,
  },
});
