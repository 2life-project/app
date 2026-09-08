/**
 * Чат ассистента. Роль сообщения называет сервер словом, а не флагом:
 * `user`, `assistant` и, возможно, служебные — незнакомую роль не показываем.
 */
export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  /** Разбор ответа на части (текст, вызовы инструментов) — форма не описана. */
  parts: readonly unknown[];
};

export type ChatThread = {
  id: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  lastMessage: string | null;
};

export type ChatThreads = { sessions: readonly ChatThread[] };
export type ChatMessages = { messages: readonly ChatMessage[] };
