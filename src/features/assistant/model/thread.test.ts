import type { ChatMessage } from '../api/contract';

import { latestThread, shownMessages, sideOf } from './thread';

const message = (extra: Partial<ChatMessage>) =>
  ({ id: '1', role: 'user', content: 'привет', parts: [], ...extra }) as ChatMessage;

describe('sideOf', () => {
  it('человек и ассистент — две стороны диалога', () => {
    expect(sideOf('user')).toBe('you');
    expect(sideOf('assistant')).toBe('assistant');
  });

  it('служебная роль не сторона: её реплику никто не писал', () => {
    expect(sideOf('system')).toBeNull();
    expect(sideOf('tool')).toBeNull();
  });
});

describe('shownMessages', () => {
  it('служебные и пустые реплики в диалог не попадают', () => {
    const shown = shownMessages([
      message({ id: 'a' }),
      message({ id: 'b', role: 'system', content: 'ты ассистент' }),
      message({ id: 'c', role: 'assistant', content: '   ' }),
      message({ id: 'd', role: 'assistant', content: 'HRV 48' }),
    ]);
    expect(shown.map((m) => m.id)).toEqual(['a', 'd']);
  });
});

describe('latestThread', () => {
  it('берём ту, в которую писали позже всех', () => {
    const threads = [
      { id: 'старая', updatedAt: 1 },
      { id: 'свежая', updatedAt: 9 },
    ];
    expect(latestThread(threads)?.id).toBe('свежая');
  });

  it('пустой список ветки не даёт', () => {
    expect(latestThread([])).toBeNull();
  });
});
