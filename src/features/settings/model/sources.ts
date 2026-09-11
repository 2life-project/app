import type { SourceId, SourceStatus } from '../api/sources';

import type { Row } from './settings';

/**
 * Строки источников из их состояния. Подпись говорит о связи и свежести, а
 * не пересказывает, что источник умеет: это знает его собственное приложение.
 */
const TITLES: Record<SourceId, { title: string; icon: Row['icon'] }> = {
  whoop: { title: 'Whoop', icon: 'watch' },
  oura: { title: 'Oura', icon: 'circle' },
  withings: { title: 'Withings', icon: 'cloud' },
  'apple-health': { title: 'Apple Health', icon: 'heart' },
  'google-health': { title: 'Google Health', icon: 'activity' },
};

export function sourceRows(sources: readonly SourceStatus[] | null, now = new Date()): Row[] {
  if (!sources) return [];

  return sources.map((source) => ({
    id: source.id,
    icon: TITLES[source.id].icon,
    tone: source.connected ? 'success' : undefined,
    title: TITLES[source.id].title,
    subtitle: subtitleOf(source, now),
    connected: source.connected,
  }));
}

function subtitleOf(source: SourceStatus, now: Date): string {
  if (source.unknown) return 'status did not load';
  if (!source.connected) return 'not connected · connect in the web app';

  const counted = Object.entries(source.counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${key.replace(/_/g, ' ')}`)
    .slice(0, 2)
    .join(', ');
  const synced =
    source.lastSyncedAt === null ? 'connected' : `synced ${ago(source.lastSyncedAt, now)}`;
  return counted ? `${synced} · ${counted}` : synced;
}

/** Давность словами: минуты, часы, дни. Точный час здесь не нужен. */
export function ago(at: number, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - at) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
