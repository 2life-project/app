import { useState } from 'react';

import { logger } from '@/core/log/logger';
import { Button, Field, Stack, Text } from '@/shared/ui';

import type { CourseDraft } from '../api/courses';
import { COURSE_FORM, courseDraftOf, type CourseFields } from '../model/course';

/**
 * Поля курса — одни и те же для нового и для правки. Сохраняет вызывающий:
 * форма знает, что ввели, а куда это уедет — создание или правка — нет.
 */
export function CourseForm({
  initial,
  action,
  onSave,
}: {
  initial: CourseFields;
  action: string;
  onSave: (draft: CourseDraft) => Promise<void>;
}) {
  const [fields, setFields] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const edit = (key: keyof CourseFields) => (next: string) => {
    setFields({ ...fields, [key]: next });
    setMessage(null);
  };

  const save = async () => {
    const draft = courseDraftOf(fields);
    if (!draft) {
      setMessage(COURSE_FORM.badDate);
      return;
    }

    setBusy(true);
    try {
      await onSave(draft);
    } catch (failure) {
      // Введённое остаётся на экране: уходить с него при отказе значит
      // потерять набранное без единого слова.
      logger.warn('Курс не сохранился', { failure });
      setMessage(COURSE_FORM.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <Field
        label={COURSE_FORM.name.label}
        hint={COURSE_FORM.name.hint}
        value={fields.name}
        onChangeText={edit('name')}
      />
      <Field
        label={COURSE_FORM.start.label}
        hint={COURSE_FORM.start.hint}
        value={fields.start}
        onChangeText={edit('start')}
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label={COURSE_FORM.end.label}
        hint={COURSE_FORM.end.hint}
        value={fields.end}
        onChangeText={edit('end')}
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      {message ? <Text tone="danger">{message}</Text> : null}
      <Button label={action} loading={busy} onPress={() => void save()} />
    </Stack>
  );
}
