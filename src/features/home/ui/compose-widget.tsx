import { useState } from 'react';

import { HttpError, reportFailure } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';
import { Button, Card, Field, ListRow, Stack, Text } from '@/shared/ui';

import type { HomeLayout, WidgetRecipe } from '../api/contract';
import { composeWidget, saveHomeLayout } from '../api/home';
import { cellsOf } from '../model/feed';

/** Тексты сборки. Экрана в макете нет — формулировки рабочие. */
const COPY = {
  label: 'Describe a widget',
  hint: 'weekly average resting heart rate',
  compose: 'Compose',
  add: 'Add to Home',
  discard: 'Discard',
  failed: 'Could not compose a widget from that. Try other words.',
  saveFailed: 'The widget did not save. Try again.',
  stale: 'The layout changed elsewhere — it is reloaded, add the widget again.',
} as const;

const CONFLICT = 409;

/**
 * Пользовательский виджет собирается в два шага, и это правило сервера, а не
 * наше: сборка возвращает черновик рецепта и раскладку не трогает. Виджетом
 * он становится, только когда человек его подтвердил и ячейка ушла в
 * раскладку под текущей ревизией.
 */
export function ComposeWidget({
  current,
  onSaved,
  onStale,
}: {
  current: HomeLayout | null;
  onSaved: (layout: HomeLayout) => void;
  /** Ревизия раскладки устарела: её надо перечитать, черновик остаётся. */
  onStale: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<WidgetRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const compose = async () => {
    const text = prompt.trim();
    if (text === '' || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { recipe } = await composeWidget(text);
      setDraft(recipe);
    } catch (failure) {
      reportFailure('Виджет не собрался', failure);
      setMessage(COPY.failed);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!current || !draft || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      // Своя ячейка со своим идентификатором: два пользовательских виджета не
      // должны делить один, иначе второй перезапишет первый.
      const cell = { id: `custom-${requestId()}`, widget: 'custom' as const, size: 1, spec: draft };
      onSaved(await saveHomeLayout(current, [...cellsOf(current), cell]));
      setDraft(null);
      setPrompt('');
    } catch (failure) {
      // Раскладку поменяли с другого устройства: с той же ревизией повтор
      // упрётся снова. Перечитываем её, а черновик рецепта оставляем.
      const stale = failure instanceof HttpError && failure.status === CONFLICT;
      if (stale) onStale();
      reportFailure('Пользовательский виджет не сохранился', failure);
      setMessage(stale ? COPY.stale : COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack gap="md">
        <Field
          label={COPY.label}
          hint={COPY.hint}
          value={prompt}
          onChangeText={setPrompt}
          returnKeyType="done"
          onSubmitEditing={() => void compose()}
        />

        {draft ? (
          <Stack gap="sm">
            <Text variant="subtitle">{`${draft.kind} widget`}</Text>
            {draft.metrics.map((metric) => (
              <ListRow
                key={`${metric.key}:${metric.aggregation}`}
                title={metric.key}
                subtitle={`${metric.aggregation} · ${metric.days} days`}
                trailing={metric.target === undefined ? undefined : `target ${metric.target}`}
              />
            ))}
            <Stack direction="row" gap="sm">
              <Button
                label={COPY.add}
                loading={busy}
                disabled={!current}
                onPress={() => void add()}
              />
              <Button label={COPY.discard} variant="plain" onPress={() => setDraft(null)} />
            </Stack>
          </Stack>
        ) : (
          <Button
            label={COPY.compose}
            variant="tonal"
            loading={busy}
            disabled={prompt.trim() === ''}
            onPress={() => void compose()}
          />
        )}

        {message ? <Text tone="danger">{message}</Text> : null}
      </Stack>
    </Card>
  );
}
