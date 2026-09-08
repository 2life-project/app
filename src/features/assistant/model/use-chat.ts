import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';

import { createThread, fetchMessages, fetchThreads, messagesKey, sendMessage } from '../api/chat';

import { latestThread, shownMessages, type Shown } from './thread';

/**
 * Диалог с ассистентом. Ветку выбираем сами: сервер их хранит списком, а
 * экран показывает одну — последнюю, в которую писали.
 *
 * Заданный вопрос дописываем в ленту сразу, не дожидаясь ответа: без этого
 * человек нажимает «отправить» и секунды три смотрит на неизменный экран.
 * Настоящую ленту вернёт сервер — своя лишь закрывает ожидание.
 */
export function useChat() {
  const [threadId, setThreadId] = useState<string | null>(null);
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
    setPending([{ id: `pending:${Date.now()}`, side: 'you', text }]);

    try {
      const id = current ?? (await createThread()).id;
      if (current === null) setThreadId(id);

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

  const start = () => {
    setThreadId(null);
    setPending([]);
    setFailed(false);
    threads.refresh();
  };

  return {
    messages,
    threads: threads.data?.sessions ?? [],
    loading: history.loading || threads.loading,
    asking,
    failed,
    ask,
    start,
    open: (id: string) => {
      setThreadId(id);
      setPending([]);
    },
  };
}
