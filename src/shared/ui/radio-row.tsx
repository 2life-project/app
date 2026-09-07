import { StyleSheet, View } from 'react-native';

import { radius, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Stack } from './stack';
import { Text } from './text';

export type RadioRowProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
};

/** Строка выбора одного из нескольких: кружок, название, чем оно сейчас. */
export function RadioRow({ title, subtitle, selected, onPress }: RadioRowProps) {
  return (
    <Pressable
      haptic={false}
      scaleTo={0.99}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}>
      <Stack direction="row" gap="md" align="center">
        <View style={[styles.ring, selected && styles.ringOn]}>
          {selected ? <View style={styles.dot} /> : null}
        </View>
        <Stack gap="xs" grow>
          <Text variant="body">{title}</Text>
          {subtitle ? (
            <Text variant="bodySmall" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </Stack>
      </Stack>
    </Pressable>
  );
}

const RING = 22;
const DOT = 8;

const styles = StyleSheet.create({
  ring: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
  },
  ringOn: { borderColor: theme.color.accent.solid },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: theme.color.accent.solid,
  },
});
