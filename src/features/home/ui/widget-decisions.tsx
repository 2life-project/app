import { useState } from 'react';

import type { Query } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import { Button, Stack, Tag, Text, WidgetCard } from '@/shared/ui';

import type { Decision } from '../api/contract';
import { resolveDecision, undoDecision } from '../api/home';

import { StateCard } from './state';

/**
 * Решения версионируются: сервер принимает ответ только против той ревизии,
 * которую видел клиент. Поэтому после каждого действия список перечитывается —
 * следующая кнопка обязана уйти уже с новой ревизией, иначе сервер её отвергнет.
 *
 * Отложить и применить выборочные пункты сервер тоже умеет, но в макете этих
 * жестов нет: срок откладывания и выбор пунктов — это экран, а не кнопка.
 */
export function DecisionsWidget({ query }: { query: Query<readonly Decision[]> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const decisions = query.data;
  if (!decisions) return <StateCard query={query} />;

  const pending = decisions.filter((decision) => decision.status !== 'resolved');

  async function run(decision: Decision, act: () => Promise<Decision>) {
    setBusy(decision.id);
    setFailed(false);
    try {
      await act();
      query.refresh();
    } catch (error) {
      logger.error('Решение не сохранилось', { id: decision.id, error });
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <WidgetCard
      title="Decisions"
      caption={pending.length > 0 ? `${pending.length} waiting` : undefined}>
      {pending.length === 0 ? (
        <Text tone="muted">Nothing waits for an answer right now.</Text>
      ) : (
        <Stack gap="md">
          {pending.map((decision) => (
            <Stack key={decision.id} gap="sm" align="flex-start">
              <Stack direction="row" gap="sm" align="center">
                <Text variant="body">{decision.title}</Text>
                {decision.status === 'snoozed' ? <Tag label="snoozed" tone="neutral" dot /> : null}
              </Stack>
              <Text variant="bodySmall" tone="muted">
                {decision.reason}
              </Text>
              <Stack direction="row" gap="sm">
                {decision.actions.includes('apply') ? (
                  <Button
                    label="Apply"
                    variant="tonal"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => run(decision, () => resolveDecision(decision, 'apply'))}
                  />
                ) : null}
                {decision.actions.includes('dismiss') ? (
                  <Button
                    label="Dismiss"
                    variant="plain"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => run(decision, () => resolveDecision(decision, 'dismiss'))}
                  />
                ) : null}
                {decision.actions.includes('undo') ? (
                  <Button
                    label="Undo"
                    variant="plain"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => run(decision, () => undoDecision(decision))}
                  />
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      {failed ? <Text tone="danger">The answer did not save. Try again.</Text> : null}
    </WidgetCard>
  );
}
