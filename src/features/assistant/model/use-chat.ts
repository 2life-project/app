import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';

import { createThread, fetchMessages, fetchThreads, messagesKey, sendMessage } from '../api/chat';

import { latestThread, shownMessages, type Shown } from './thread';
import { openThread, useChosenThread } from './thread-choice';

/**
 * Диалог с ассистентом. Ветку выбираем сами: сервер их хранит списком, а
 * экран показывает одну — последнюю, в которую писали.
 *
 * Заданный вопрос дописываем в ленту сразу, не дожидаясь ответа: без этого
 * человек нажимает «отправить» и секунды три смотрит на неизменный экран.
 * Настоящую ленту вернёт сервер — своя лишь закрывает ожидание.
 */
export function useChat() {
  // Ветку выбирают в панели истории — это отдельный маршрут, и передать ему
  // состояние экрана нельзя. Выбор живёт в общем факте, экран за ним следит.
  const threadId = useChosenThread();
  const [pending, setPending] = useState<Shown[]>([]);
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);

  const threads = useQuery('chat:threads', (signal) => fetchThreads(signal));
  const current = threadId ?? latestThread(threads.data?.sessions ?? [])?.id ?? null;

  const history = useQuery(current === null ? null : messagesKey(current), (signal) =>
    fetchMessages(current ?? '', signal),
  );

  const messages = [...shownMessages(history.data?.messages ?? []), ...pending];

  const ask = async (question: string) => {
    const text = question.trim();
    if (text === '' || asking) return;

    setAsking(true);
    setFailed(false);
    // Неотправленные реплики копятся, а не затирают друг друга: иначе
    // предыдущий неудавшийся вопрос исчезал бы из ленты без предупреждения.
    setPending([...pending, { id: `pending:${Date.now()}`, side: 'you', text }]);

    try {
      const id = current ?? (await createThread()).id;
      if (current === null) openThread(id);

      await sendMessage(id, [
        ...(history.data?.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ]);
      history.refresh();
      threads.refresh();
      setPending([]);
    } catch (failure) {
      logger.warn('Ассистент не ответил', { failure });
      setFailed(true);
    } finally {
      setAsking(false);
    }
  };

  return {
    messages,
    threads: threads.data?.sessions ?? [],
    loading: history.loading || threads.loading,
    asking,
    failed,
    ask,
  };
}
