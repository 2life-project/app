import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type LinkCardProps = {
  label: string;
  onPress: () => void;
};

/** Широкая ссылка-карточка в конце раздела: «Больше графиков ›». */
export function LinkCard({ label, onPress }: LinkCardProps) {
  return (
    <Pressable haptic={false} scaleTo={0.99} onPress={onPress}>
      <View style={styles.card}>
        <Text variant="body" tone="accent">
          {label}
        </Text>
        <Feather name="chevron-right" size={size.icon.md} color={theme.color.accent.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 52,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.color.surfaceEdge,
    backgroundColor: theme.color.surface,
  },
});
