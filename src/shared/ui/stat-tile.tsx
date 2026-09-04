import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';

import { Text } from './text';

export type StatTileProps = {
  /** Что за показатель: SLEEP, HRV. Капсом, как в макете. */
  label: string;
  value: string;
  /** Единица рядом со значением — мельче и приглушённее его. */
  unit?: string;
  /** Опора для значения: «of 8:00», «base 62». */
  note?: string;
};

/** Плитка показателя внутри виджета: подпись, значение, опора. */
export function StatTile({ label, value, unit, note }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="ringValue">
        {value}
        {unit ? (
          <Text variant="footnote" tone="muted">
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
      {note ? (
        <Text variant="footnote" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.color.surfaceInnerEdge,
    backgroundColor: theme.color.surfaceInner,
  },
});
