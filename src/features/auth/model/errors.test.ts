import { HttpError } from '@/core/http/error';

import { AUTH } from './copy';
import { authMessage } from './errors';

describe('authMessage', () => {
  const fail = (body: unknown) => new HttpError(400, body);

  it('код сервера превращается в нашу формулировку', () => {
    expect(authMessage(fail({ error: 'invalid_username' }), 'x')).toBe(AUTH.badUsername);
    expect(authMessage(fail({ error: 'invalid_credentials' }), 'x')).toBe(AUTH.wrongPair);
  });

  it('тело приходит строкой — код всё равно читается', () => {
    expect(authMessage(fail('{"error":"username_taken"}'), 'x')).toBe(AUTH.loginTaken);
  });

  it('незнакомый код не выдумываем — отдаём общую строку', () => {
    expect(authMessage(fail({ error: 'quota_exceeded_v7' }), 'общая')).toBe('общая');
  });

  it('битое или чужое тело не роняет разбор', () => {
    expect(authMessage(fail('не json'), 'общая')).toBe('общая');
    expect(authMessage(fail(null), 'общая')).toBe('общая');
    expect(authMessage(new Error('сеть'), 'общая')).toBe('общая');
  });
});
