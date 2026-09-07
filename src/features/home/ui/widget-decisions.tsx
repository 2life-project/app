import { useState } from 'react';

import type { Query } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import {
  ActionLink,
  Button,
  CheckCircle,
  ListRow,
  Sheet,
  Stack,
  Tag,
  Text,
  WidgetCard,
} from '@/shared/ui';

import type { Decision } from '../api/contract';
import { applyDecisionItems, resolveDecision, snoozeDecision, undoDecision } from '../api/home';

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
  const [snoozing, setSnoozing] = useState<Decision | null>(null);
  const [choosing, setChoosing] = useState<Decision | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

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
                {decision.actions.includes('items') && decision.items.length > 1 ? (
                  <Button
                    label="Choose"
                    variant="plain"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => {
                      setPicked(
                        decision.items.filter((item) => item.executable).map((item) => item.id),
                      );
                      setChoosing(decision);
                    }}
                  />
                ) : null}
                {decision.actions.includes('snooze') ? (
                  <Button
                    label="Later"
                    variant="plain"
                    size="sm"
                    disabled={busy !== null}
                    onPress={() => setSnoozing(decision)}
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

      {/* Срок откладывания выбирает человек: сервер принимает момент, а не
          «на потом», и угадывать за него, сколько это, неправильно. */}
      <Sheet
        visible={snoozing !== null}
        onClose={() => setSnoozing(null)}
        title="Remind me later"
        action={<ActionLink label="Cancel" onPress={() => setSnoozing(null)} />}>
        <Stack gap="sm">
          {SNOOZE_OPTIONS.map((option) => (
            <ListRow
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              onPress={() => {
                const decision = snoozing;
                setSnoozing(null);
                if (decision) void run(decision, () => snoozeDecision(decision, option.until()));
              }}
            />
          ))}
        </Stack>
      </Sheet>

      <Sheet
        visible={choosing !== null}
        onClose={() => setChoosing(null)}
        title="What to apply"
        action={
          <ActionLink
            label="Apply"
            onPress={() => {
              const decision = choosing;
              setChoosing(null);
              if (decision) void run(decision, () => applyDecisionItems(decision, picked));
            }}
          />
        }>
        <Stack gap="sm">
          {(choosing?.items ?? []).map((item) => (
            <ListRow
              key={item.id}
              leading={<CheckCircle checked={picked.includes(item.id)} />}
              title={item.title}
              subtitle={item.executable ? item.action : `${item.action} · not executable`}
              onPress={() =>
                setPicked(
                  picked.includes(item.id)
                    ? picked.filter((id) => id !== item.id)
                    : [...picked, item.id],
                )
              }
            />
          ))}
        </Stack>
      </Sheet>
    </WidgetCard>
  );
}

/**
 * Когда напомнить. Сервер ждёт момент времени, поэтому варианты считаются
 * здесь — «через час» у человека и у сервера должно значить одно и то же.
 */
const SNOOZE_OPTIONS = [
  {
    id: 'hour',
    title: 'In an hour',
    subtitle: 'if it just needs a pause',
    until: () => inHours(1),
  },
  {
    id: 'evening',
    title: 'This evening',
    subtitle: 'together with the check-in',
    until: () => atHour(21),
  },
  {
    id: 'tomorrow',
    title: 'Tomorrow morning',
    subtitle: 'decide on fresh data',
    until: () => atHour(9, 1),
  },
] as const;

function inHours(hours: number): string {
  const at = new Date();
  at.setHours(at.getHours() + hours);
  return at.toISOString();
}

function atHour(hour: number, addDays = 0): string {
  const at = new Date();
  at.setDate(at.getDate() + addDays);
  at.setHours(hour, 0, 0, 0);
  return at.toISOString();
}
