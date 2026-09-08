import { router } from 'expo-router';

import { useQuery } from '@/core/http/use-query';
import { dayOf, shortDay } from '@/shared/lib/day';
import { ActionLink, ListRow, SheetBody, Text } from '@/shared/ui';

import { fetchThreads } from '../api/chat';
import { THREADS_NOTE } from '../model/chat';
import { openThread, startThread } from '../model/thread-choice';

/** История диалогов. Выбор ветки переживает закрытие панели — он в хранилище. */
export function ThreadsScreen() {
  const query = useQuery('chat:threads', (signal) => fetchThreads(signal));
  const threads = query.data?.sessions ?? [];

  return (
    <SheetBody
      title="Threads"
      action={
        <ActionLink
          label="+ New"
          onPress={() => {
            startThread();
            router.back();
          }}
        />
      }>
      {threads.map((thread) => (
        <ListRow
          key={thread.id}
          // Названия у ветки нет — сервер отдаёт последнюю реплику, и она
          // говорит о содержании больше любого придуманного заголовка.
          title={thread.lastMessage ?? 'Empty thread'}
          subtitle={shortDay(dayOf(thread.updatedAt))}
          onPress={() => {
            openThread(thread.id);
            router.back();
          }}
        />
      ))}
      {threads.length === 0 ? (
        <Text tone="muted">{query.loading ? 'Loading…' : 'No threads yet.'}</Text>
      ) : null}
      <Text variant="footnote" tone="muted">
        {THREADS_NOTE}
      </Text>
    </SheetBody>
  );
}
