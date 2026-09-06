import { router } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';

import { usePersistentState } from '@/shared/lib/store';
import { radius, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Button,
  Card,
  Screen,
  ScreenHeader,
  Segmented,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';

import { CHECK_IN_FORMS, CLOSING_NOTE, NOTE, QUESTIONS, type CheckInForm } from '../model/check-in';

export const CheckInScreenOptions = { headerShown: false };

const INITIAL_ANSWERS: Record<string, number> = Object.fromEntries(
  QUESTIONS.map((question) => [question.key, question.initial]),
);

/** Чек-ин вечера: три шкалы и заметка. Ответы не подставляются за человека. */
export function CheckInScreen() {
  const [form, setForm] = usePersistentState<CheckInForm>('checkin:form', 'short');
  const [answers, setAnswers] = usePersistentState<Record<string, number>>(
    'checkin:answers',
    INITIAL_ANSWERS,
  );
  const [note, setNote] = usePersistentState('checkin:note', '');

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="How was the day?"
          subtitle="evening check-in · 30 seconds"
          action={<ActionLink label="Skip" onPress={() => router.back()} />}
        />

        <Segmented items={CHECK_IN_FORMS} value={form} onChange={setForm} />

        {QUESTIONS.map((question) => (
          <Card key={question.key}>
            <Stack gap="md">
              <Stack gap="xs">
                <Text variant="subtitle">{question.title}</Text>
                <Text variant="bodySmall" tone="muted">
                  {question.hint}
                </Text>
              </Stack>

              <Slider
                accessibilityLabel={question.title}
                value={answers[question.key] ?? question.initial}
                minimum={question.minimum}
                maximum={question.maximum}
                onChange={(value) => setAnswers({ ...answers, [question.key]: value })}
              />

              <Stack direction="row" justify="space-between">
                <Text variant="bodySmall" tone="muted">
                  {question.minimum}
                </Text>
                <Text variant="bodySmall">{answers[question.key] ?? question.initial}</Text>
                <Text variant="bodySmall" tone="muted">
                  {question.maximum}
                </Text>
              </Stack>
            </Stack>
          </Card>
        ))}

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">{NOTE.title}</Text>
            <TextInput
              style={styles.note}
              placeholder={NOTE.hint}
              placeholderTextColor={theme.color.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </Stack>
        </Card>

        <Button label="Save the check-in" onPress={() => router.back()} />

        <Text variant="footnote" tone="muted" style={styles.closing}>
          {CLOSING_NOTE}
        </Text>
      </Stack>
    </Screen>
  );
}

const NOTE_HEIGHT = 72;

const styles = StyleSheet.create({
  note: {
    height: NOTE_HEIGHT,
    padding: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.color.surfaceInner,
    color: theme.color.text,
    textAlignVertical: 'top',
  },
  closing: { textAlign: 'center' },
});
