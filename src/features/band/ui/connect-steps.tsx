import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { radius, size, theme } from '@/shared/theme';
import { Stack, Text } from '@/shared/ui';

import type { ConnectStep } from '../model/band-state';

/**
 * Ход подключения по шагам.
 *
 * Их три и вместе они занимают до полуминуты: открыть канал, сверить часы,
 * выставить настройки, вычитать день. Неподвижное «подключаемся…» всё это
 * время человек читает как зависшее приложение и жмёт заново — обрывая обмен
 * ровно посередине.
 */
const STEPS: { id: ConnectStep; title: string; note: string }[] = [
  {
    id: 'opening',
    title: 'Opening the channel',
    note: 'The band keeps one connection — close the maker’s app if it holds it.',
  },
  {
    id: 'configuring',
    title: 'Setting the band up',
    note: 'Clock, body profile and how often it measures.',
  },
  { id: 'reading', title: 'Reading today', note: 'Steps, heart rate, last night’s sleep.' },
];

export function ConnectSteps({ current }: { current: ConnectStep }) {
  const index = STEPS.findIndex((step) => step.id === current);

  return (
    <Stack gap="md">
      {STEPS.map((step, at) => {
        const done = at < index;
        const active = at === index;

        return (
          <Stack key={step.id} direction="row" gap="md" align="center">
            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
              {active ? <ActivityIndicator size="small" color={theme.color.accent.on} /> : null}
              {done ? (
                <Text variant="caption" tone="onHighlight">
                  ✓
                </Text>
              ) : null}
            </View>
            <Stack gap="xs" grow>
              <Text variant="body" tone={active || done ? 'default' : 'muted'}>
                {step.title}
              </Text>
              {active ? (
                <Text variant="bodySmall" tone="muted">
                  {step.note}
                </Text>
              ) : null}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: size.border,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSunken,
  },
  dotActive: { backgroundColor: theme.color.accent.solid, borderColor: theme.color.accent.solid },
  dotDone: {
    backgroundColor: theme.color.highlight.solid,
    borderColor: theme.color.highlight.solid,
  },
});
