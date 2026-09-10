import { request } from '@/core/http/client';

import type { ProtocolBundle, ProtocolProgress } from './contract';

/** Ручки протоколов: список, один протокол с составом и прогресс по целям. */

export function fetchProtocols(signal?: AbortSignal): Promise<{ protocols: ProtocolBundle[] }> {
  return request<{ protocols: ProtocolBundle[] }>('/api/protocols', { signal });
}

export function fetchProtocol(id: string, signal?: AbortSignal): Promise<ProtocolBundle> {
  return request<{ protocol: ProtocolBundle }>(`/api/protocols/${encodeURIComponent(id)}`, {
    signal,
  }).then((answer) => answer.protocol);
}

export function fetchProgress(id: string, signal?: AbortSignal): Promise<ProtocolProgress> {
  return request<ProtocolProgress>(`/api/protocols/${encodeURIComponent(id)}/progress`, {
    signal,
  });
}
