import { setAuthToken } from './auth';
import { HttpError, request } from './client';

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
  afterEach(() => setAuthToken(null));

  it('без токена заголовок не отправляется', async () => {
    respondWith('{}');
    await request('/thing');

    expect(lastInit?.headers).not.toHaveProperty('Authorization');
  });

  it('с токеном уходит Bearer', async () => {
    setAuthToken('abc');
    respondWith('{}');
    await request('/thing');

    expect(lastInit?.headers).toHaveProperty('Authorization', 'Bearer abc');
  });
});
