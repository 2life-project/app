import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';
import { Button, Field, Pressable, Stack, Text } from '@/shared/ui';

import type { Alarm } from '../api';
import { DAYS, hasDay, LABEL_LIMIT, parseTime, timeText, toggleDay } from '../model/alarm-view';
import type { AlarmDraft } from '../model/use-alarms';

/**
 * Правка одного будильника.
 *
 * Время вводится текстом, а не колесом системы: колесо — это отдельная
 * нативная зависимость ради одного экрана. Поле принимает и `7:30`, и `07:30`,
 * а рядом стоит разбор — человек видит, что именно поняли, до сохранения.
 * ponytail: станет неудобно — берём нативный пикер, разбор уже отделён.
 */
export function AlarmEditor({
  alarm,
  busy,
  onSave,
  onRemove,
}: {
  /** `undefined` — новый будильник в свободной ячейке. */
  alarm?: Alarm;
  busy: boolean;
  onSave: (draft: AlarmDraft) => void;
  onRemove?: () => void;
}) {
  const [time, setTime] = useState(alarm ? timeText(alarm.hour, alarm.minute) : '07:30');
  const [days, setDays] = useState(alarm?.days ?? 0);
  const [label, setLabel] = useState(alarm?.label ?? '');
  const [shown, setShown] = useState(false);

  const parsed = parseTime(time);

  const save = () => {
    setShown(true);
    if (!parsed) return;
    onSave({
      slot: alarm?.slot,
      hour: parsed.hour,
      minute: parsed.minute,
      days,
      enabled: true,
      label: label.trim() === '' ? undefined : label.trim(),
    });
  };

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Field
          label="Time"
          hint="07:30"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          value={time}
          onChangeText={setTime}
        />
        {parsed || !shown ? null : (
          <Text variant="bodySmall" tone="danger">
            Use HH:MM in 24-hour time.
          </Text>
        )}
      </Stack>

      <Stack gap="sm">
        <Text variant="caption" tone="muted">
          REPEAT
        </Text>
        <View style={styles.days}>
          {DAYS.map((day) => {
            const on = hasDay(days, day.bit);
            return (
              <Pressable
                key={day.short}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={day.short}
                scaleTo={0.94}
                onPress={() => setDays(toggleDay(days, day.bit))}
                style={[styles.day, on && styles.dayOn]}>
                <Text variant="label" tone={on ? 'onHighlight' : 'muted'}>
                  {day.short}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="bodySmall" tone="muted">
          {days === 0 ? 'Rings once, then stops repeating.' : 'Rings on the days you picked.'}
        </Text>
      </Stack>

      <Field
        label="Label"
        hint="Wake up"
        maxLength={LABEL_LIMIT}
        value={label}
        onChangeText={setLabel}
      />

      <Button label={busy ? 'Saving…' : 'Save to the band'} disabled={busy} onPress={save} />
      {onRemove ? (
        <Button label="Delete" variant="plain" tone="danger" disabled={busy} onPress={onRemove} />
      ) : null}
    </Stack>
  );
}

const DAY_SIZE = 42;

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  day: {
    minWidth: DAY_SIZE,
    height: size.tapTarget,
    paddingHorizontal: space.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceSunken,
    borderWidth: size.border,
    borderColor: theme.color.border,
  },
  dayOn: { backgroundColor: theme.color.highlight.solid, borderColor: theme.color.highlight.solid },
});
