import { request } from '@/core/http/client';

import type { ChatMessages, ChatThread, ChatThreads } from './contract';

/** Ручки ассистента: ветки диалога, их сообщения и отправка нового. */

export function fetchThreads(signal?: AbortSignal): Promise<ChatThreads> {
  return request<ChatThreads>('/api/chat/sessions', { signal });
}

export function messagesKey(threadId: string): string {
  return `chat:${threadId}`;
}

export function fetchMessages(threadId: string, signal?: AbortSignal): Promise<ChatMessages> {
  return request<ChatMessages>(
    `/api/chat/messages?${new URLSearchParams({ sessionId: threadId }).toString()}`,
    { signal },
  );
}

export function createThread(): Promise<ChatThread> {
  return request<ChatThread>('/api/chat/sessions', { method: 'POST', body: {} });
}

/**
 * Отправка вопроса. Сервер принимает всю переписку, а не одну реплику: модель
 * отвечает по контексту, и обрезать его на клиенте значит менять ответ.
 */
export function sendMessage(
  threadId: string,
  history: readonly { role: string; content: string }[],
): Promise<unknown> {
  return request<unknown>('/api/chat', {
    method: 'POST',
    body: {
      sessionId: threadId,
      messages: history.map((message) => ({ role: message.role, content: message.content })),
    },
  });
}
