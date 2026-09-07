import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { useToday } from '@/shared/lib/day';
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

import { checkinKey, createNote, fetchCheckin, saveCheckin } from '../api/checkin';
import { CHECK_IN_FORMS, CLOSING_NOTE, NOTE, type CheckInForm } from '../model/check-in';

export const CheckInScreenOptions = { headerShown: false };

/**
 * Чек-ин вечера. Вопросы и их шкалы приходят с сервера — анкета версионируется,
 * и рисовать её из своих констант значило бы показывать вчерашнюю.
 */
export function CheckInScreen() {
  const { date, timeZone } = useToday();
  const [form, setForm] = useState<CheckInForm>('short');
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const query = useQuery(checkinKey(date, timeZone, form), (signal) =>
    fetchCheckin(date, timeZone, form, signal),
  );
  const checkin = query.data;

  const save = () => {
    if (!checkin) return;
    setSaving(true);
    const at = new Date().toISOString();

    // Заметка уходит отдельным событием журнала: у чек-ина своего поля для
    // неё нет, а терять написанное нельзя.
    const jobs: Promise<unknown>[] = [saveCheckin(checkin, edits, at)];
    if (note.trim()) jobs.push(createNote(note.trim(), at, timeZone));

    void Promise.all(jobs)
      .then(() => router.back())
      .finally(() => setSaving(false));
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="How was the day?"
          subtitle={
            checkin
              ? `evening check-in · ${checkin.progress.completed} of ${checkin.progress.total} answered`
              : 'evening check-in'
          }
          action={<ActionLink label="Skip" onPress={() => router.back()} />}
        />

        <Segmented items={CHECK_IN_FORMS} value={form} onChange={setForm} />

        {!checkin ? (
          <Card variant="sunken">
            <Text tone="muted">
              {query.loading ? 'Loading the questions…' : 'The check-in did not load.'}
            </Text>
          </Card>
        ) : (
          <>
            {checkin.questionnaire.questions.map((question) => {
              // Ответ показываем против его собственной шкалы: старые ответы
              // не пересчитываются под новую анкету.
              const answer = checkin.answers[question.key];
              const value =
                edits[question.key] ??
                answer?.value ??
                Math.round((question.minimum + question.maximum) / 2);

              return (
                <Card key={question.key}>
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Text variant="subtitle">{question.title}</Text>
                      <Text variant="bodySmall" tone="muted">
                        {`${question.minimum}–${question.maximum} · ${question.metric}`}
                      </Text>
                    </Stack>

                    <Slider
                      accessibilityLabel={question.title}
                      value={value}
                      minimum={question.minimum}
                      maximum={question.maximum}
                      onChange={(next) => setEdits({ ...edits, [question.key]: next })}
                    />

                    <Stack direction="row" justify="space-between">
                      <Text variant="bodySmall" tone="muted">
                        {question.minimum}
                      </Text>
                      <Text variant="bodySmall">{value}</Text>
                      <Text variant="bodySmall" tone="muted">
                        {question.maximum}
                      </Text>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}

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

            <Button
              label={saving ? 'Saving…' : 'Save the check-in'}
              disabled={saving}
              onPress={save}
            />
          </>
        )}

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
