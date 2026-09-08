import { request } from '@/core/http/client';

import type { ProtocolBundle, Targets } from './contract';

/** Ручки протоколов: список, один протокол и его цели. */

export function fetchProtocols(signal?: AbortSignal): Promise<{ protocols: ProtocolBundle[] }> {
  return request<{ protocols: ProtocolBundle[] }>('/api/protocols', { signal });
}

export function fetchTargets(id: string, signal?: AbortSignal): Promise<Targets> {
  return request<Targets>(`/api/protocols/${encodeURIComponent(id)}/targets`, { signal });
}
