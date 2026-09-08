import { HttpError, request } from './client';

// Сессия подменена: клиенту от неё нужны две вещи — текущий ключ и попытка
// продлить его. Настоящая ходит в Keychain и в сеть, здесь это лишнее.
// Префикс `mock` обязателен: jest поднимает фабрику выше объявлений и других
// переменных в неё не пускает.
const mockSession = { token: null as string | null, renewable: false };

jest.mock('@/core/auth', () => ({
  authToken: () => mockSession.token,
  refreshSession: () => Promise.resolve(mockSession.renewable),
}));

function setToken(next: string | null) {
  mockSession.token = next;
}

const originalFetch = global.fetch;
let lastInit: RequestInit | undefined;

function respondWith(body: string, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  global.fetch = jest.fn(async (_url: unknown, requestInit?: RequestInit) => {
    lastInit = requestInit;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
  lastInit = undefined;
});

describe('request', () => {
  it('возвращает разобранный JSON', async () => {
    respondWith('{"value":42}');

    await expect(request<{ value: number }>('/thing')).resolves.toEqual({ value: 42 });
  });

  it('на 204 отдаёт null, а не падает на пустом теле', async () => {
    respondWith('', { status: 204 });

    await expect(request('/thing')).resolves.toBeNull();
  });

  // Captive-портал и прокси отвечают 200 и HTML. Вернуть null под типом T
  // значит уронить экран на первом обращении к полю.
  it('на успешном ответе не-JSON поднимает ошибку, а не отдаёт null', async () => {
    respondWith('<html>login</html>');

    await expect(request('/thing')).rejects.toThrow('не является JSON');
  });

  it('на не-2xx поднимает HttpError с разобранным телом', async () => {
    respondWith('{"code":"INVALID"}', { status: 422 });

    await expect(request('/thing')).rejects.toMatchObject({
      name: 'HttpError',
      status: 422,
      body: { code: 'INVALID' },
    });
    await expect(request('/thing')).rejects.toBeInstanceOf(HttpError);
  });

  // Свой signal должен складываться с таймаутом, а не заменять его.
  it('не выключает таймаут, когда передан свой signal', async () => {
    respondWith('{}');
    const controller = new AbortController();

    await request('/thing', { signal: controller.signal });

    expect(lastInit?.signal).toBeDefined();
    expect(lastInit?.signal).not.toBe(controller.signal);
  });

  it('передаёт Content-Type только когда есть тело', async () => {
    respondWith('{}');
    await request('/thing');
    expect(lastInit?.headers).not.toHaveProperty('Content-Type');

    respondWith('{}');
    await request('/thing', { method: 'POST', body: { a: 1 } });
    expect(lastInit?.headers).toHaveProperty('Content-Type', 'application/json');
  });
});

describe('авторизация', () => {
  afterEach(() => {
    setToken(null);
    mockSession.renewable = false;
  });

  it('без токена заголовок не отправляется', async () => {
    respondWith('{}');
    await request('/thing');

    expect(lastInit?.headers).not.toHaveProperty('Authorization');
  });

  it('с токеном уходит Bearer', async () => {
    setToken('abc');
    respondWith('{}');
    await request('/thing');

    expect(lastInit?.headers).toHaveProperty('Authorization', 'Bearer abc');
  });

  it('401 при живой сессии — это «пора продлить»: повтор после обмена', async () => {
    mockSession.renewable = true;
    const answers = [
      { status: 401, body: '{}' },
      { status: 200, body: '{"ok":true}' },
    ];
    let call = 0;
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      lastInit = init;
      const answer = answers[call++] ?? { status: 200, body: '{"ok":true}' };
      return {
        ok: answer.status < 400,
        status: answer.status,
        text: async () => answer.body,
      } as unknown as Response;
    }) as unknown as typeof fetch;

    await expect(request('/thing')).resolves.toEqual({ ok: true });
    expect(call).toBe(2);
  });

  it('продлить не вышло — отдаём 401, а не крутим повторы', async () => {
    mockSession.renewable = false;
    respondWith('{}', { status: 401 });

    await expect(request('/thing')).rejects.toBeInstanceOf(HttpError);
  });
});
