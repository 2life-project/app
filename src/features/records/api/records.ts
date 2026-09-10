import { request, searchParams } from '@/core/http/client';

import type {
  Biochemistry,
  DocumentRow,
  Examinations,
  GeneticsReport,
  GeneticsSummary,
  MarkerHistory,
  MarkerOverview,
  MarkerTrend,
} from './contract';

/** Ручки медкарты. Биохимия и обследования — в v2, документы — общей ручкой. */

export function fetchBiochemistry(signal?: AbortSignal): Promise<Biochemistry> {
  return request<Biochemistry>('/api/v2/biochemistry/markers', { signal });
}

export function fetchDocuments(signal?: AbortSignal): Promise<{ documents: DocumentRow[] }> {
  return request<{ documents: DocumentRow[] }>('/api/documents', { signal });
}

export function fetchExaminations(signal?: AbortSignal): Promise<Examinations> {
  return request<Examinations>('/api/v2/examinations', { signal });
}

const marker = (key: string) => `/api/v2/biochemistry/markers/${encodeURIComponent(key)}`;

export function fetchMarkerOverview(key: string, signal?: AbortSignal): Promise<MarkerOverview> {
  return request<MarkerOverview>(`${marker(key)}/overview`, { signal });
}

export function fetchMarkerTrend(key: string, signal?: AbortSignal): Promise<MarkerTrend> {
  return request<MarkerTrend>(`${marker(key)}/trend`, { signal });
}

export function fetchMarkerHistory(key: string, signal?: AbortSignal): Promise<MarkerHistory> {
  return request<MarkerHistory>(`${marker(key)}/history`, { signal });
}

export function fetchGeneticsSummary(signal?: AbortSignal): Promise<GeneticsSummary> {
  return request<GeneticsSummary>('/api/genetics/summary', { signal });
}

export function fetchGeneticsReport(
  uploadId: string,
  signal?: AbortSignal,
): Promise<GeneticsReport> {
  const query = searchParams({ uploadId });
  return request<GeneticsReport>(`/api/genetics/genuser?${query}`, { signal });
}
