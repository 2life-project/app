import { StyleSheet, View } from 'react-native';

import { radius, space, theme, type Tone } from '@/shared/theme';

import { ProgressBar } from './progress-bar';
import { Text } from './text';

export type StatTileProps = {
  /** Что за показатель: SLEEP, HRV. Капсом, как в макете. */
  label: string;
  value: string;
  /** Единица рядом со значением — мельче и приглушённее его. */
  unit?: string;
  /** Опора для значения: «of 8:00», «base 62». */
  note?: string;
  /** Точка статуса перед пояснением: показывает отклонение от нормы. */
  noteTone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  /** Полоса под значением — доля от цели. */
  progress?: { value: number; tone: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'> };
};

/** Плитка показателя внутри виджета: подпись, значение, опора. */
export function StatTile({ label, value, unit, note, noteTone, progress }: StatTileProps) {
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
        <View style={styles.note}>
          {noteTone ? (
            <View style={[styles.dot, { backgroundColor: theme.color[noteTone].solid }]} />
          ) : null}
          <Text variant="footnote" tone="muted">
            {note}
          </Text>
        </View>
      ) : null}
      {progress ? (
        <View style={styles.progress}>
          <ProgressBar value={progress.value} tone={progress.tone} />
        </View>
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
  progress: { alignSelf: 'stretch', marginTop: space.xs },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 6, height: 6, borderRadius: radius.full },
});
