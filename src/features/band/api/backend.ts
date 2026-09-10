import { authToken, refreshSession } from '@/core/auth';
import { env } from '@/core/config/env';
import { HttpError, request, type JsonValue } from '@/core/http/client';

/**
 * Контракт приёмника данных браслета: ровно те поля, которыми обменивается
 * клиент, и ничего сверх них.
 *
 * Тела запросов и ответов — как есть, без обёртки `data`. Разбор устройства
 * сюда не заглядывает: здесь только транспорт и формы, а что во что
 * превращается — забота модели.
 */

/** Версия формы пачки. Приёмник принимает только её. */
const SCHEMA = 'es100-v1';

/** Потоки, которыми приёмник различает исходные данные. */
export type BandStream =
  | 'activity_samples'
  | 'day_summaries'
  | 'sleep_sessions'
  | 'stress_days'
  | 'measurements'
  | 'workouts'
  | 'workout_ticks'
  | 'recording_marks'
  | 'recorder_events'
  | 'wear_windows'
  | 'activity_states'
  | 'recording_inventory'
  | 'device_info'
  | 'device_state'
  | 'capabilities'
  | 'settings'
  | 'vendor_payloads';

/**
 * Насколько можно доверять времени записи.
 *
 * `known` ставится только когда часы устройства сверены с телефоном.
 * Повышать качество при повторной отправке нельзя: время от этого не
 * становится точнее, а приёмник принял бы догадку за измерение.
 */
export type TimeQuality = 'known' | 'unknown' | 'clock_reset';

/** Пределы, которые приёмник объявляет при регистрации. */
export type BandLimits = {
  maxRecordsPerBatch: number;
  maxBatchBytes: number;
  maxRecordBytes: number;
  audioPartBytes: number;
  maxAudioBytes: number;
};

export type RegisteredBand = {
  id: string;
  provider: string;
  transport: string;
  status: string;
  bindingVersion: number;
  limits: BandLimits;
};

export type IngestionRecord = {
  eventId: string;
  sequence: number;
  stream: BandStream;
  capturedAt: string;
  timeQuality: TimeQuality;
  payload: JsonValue;
};

/**
 * Период, который клиент считает вычитанным.
 *
 * Без него «за пятое сентября данных не было» неотличимо от «пятое сентября не
 * синхронизировали», а разница существенная: заводской сброс обнуляет историю
 * устройства, и глубже четырёх суток она не хранится вовсе.
 */
export type Coverage = {
  stream: BandStream;
  from: string;
  to: string;
  complete: boolean;
};

export type Batch = {
  deliveryId: string;
  bindingVersion: number;
  clientInstanceId: string;
  deviceEpoch: string | null;
  moduleVersion: string;
  timezone: string;
  records: readonly IngestionRecord[];
  coverage: readonly Coverage[];
};

export type RecordIssue = {
  code: string;
  path: string;
  message: string;
  retryable: boolean;
};

export type Receipt = {
  deliveryId: string;
  rawStatus: string;
  receivedAt: string;
  processingStatus: 'processing' | 'completed' | 'completed_with_issues';
  records: {
    index: number;
    eventId: string;
    rawStatus: string;
    mappingStatus: string;
    canonical: { observations: number; sessions: number; segments: number };
    issues: RecordIssue[];
  }[];
  /** Есть только в ответе на отправку: точный повтор пачки. */
  duplicate?: boolean;
};

/** Заявка на аудиофайл: сначала регистрируется, потом грузится частями. */
export type RecordingClaim = {
  bindingVersion: number;
  clientInstanceId: string;
  clientRecordingId: string;
  deviceEpoch: string | null;
  timezone: string;
  session: number;
  startedAt: string;
  deviceBytes: number;
  uploadBytes: number;
  seconds: number;
  sha256: string;
  marks: readonly { index: number; offsetSeconds: number }[];
};

export type StoredPart = { partNumber: number; bytes: number; sha256: string };

export type RemoteRecording = {
  id: string;
  bandId: string;
  clientRecordingId: string;
  session: number;
  startedAt: string;
  seconds: number;
  status: string;
  /** Единственное подтверждение, что оригинал у сервера цел. */
  audioStored: boolean;
  uploadBytes: number;
  sha256: string;
  transcriptVersion: number;
  voiceMemoId: string | null;
  actionsStatus: string;
  error: string | null;
  partBytes: number;
  parts: StoredPart[];
};

export function registerBand(clientInstanceId: string, device: JsonValue): Promise<RegisteredBand> {
  return request<RegisteredBand>('/api/v2/bands', {
    method: 'POST',
    body: { provider: 'es100', clientInstanceId, device },
  });
}

/** Закрыть приём новых данных, историю сервер сохраняет. */
export function disconnectBand(bandId: string, bindingVersion: number): Promise<unknown> {
  return request(`/api/v2/bands/${bandId}/disconnect`, {
    method: 'POST',
    body: { bindingVersion },
  });
}

export function sendBatch(bandId: string, batch: Batch): Promise<Receipt> {
  return request<Receipt>(`/api/v2/bands/${bandId}/ingestions`, {
    method: 'POST',
    body: { schemaVersion: SCHEMA, ...batch },
  });
}

export function fetchReceipt(bandId: string, deliveryId: string): Promise<Receipt> {
  return request<Receipt>(`/api/v2/bands/${bandId}/ingestions/${deliveryId}`);
}

/** Формат файла записи: браслет пишет Opus, телефон заворачивает его в Ogg. */
const AUDIO = { contentType: 'audio/ogg', codec: 'opus' } as const;

export function claimRecording(bandId: string, claim: RecordingClaim): Promise<RemoteRecording> {
  return request<RemoteRecording>(`/api/v2/bands/${bandId}/recordings`, {
    method: 'POST',
    body: { schemaVersion: SCHEMA, ...AUDIO, ...claim },
  });
}

export function completeUpload(recordingId: string): Promise<RemoteRecording> {
  return request<RemoteRecording>(`/api/v2/band-recordings/${recordingId}/complete-upload`, {
    method: 'POST',
    body: {},
  });
}

export function fetchRecording(recordingId: string): Promise<RemoteRecording> {
  return request<RemoteRecording>(`/api/v2/band-recordings/${recordingId}`);
}

/**
 * Часть аудиофайла — мимо общего клиента.
 *
 * У того тело только JSON и пятнадцать секунд на запрос: восемь мегабайт по
 * сотовой сети в это окно не укладываются, а `JSON.stringify` от байтов
 * отправил бы строку с индексами вместо звука. Поэтому здесь свой запрос со
 * своим сроком — и тот же обмен ключа при просрочке, что у общего клиента.
 */
const PART_TIMEOUT_MS = 180_000;

export async function uploadPart(
  recordingId: string,
  partNumber: number,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<StoredPart> {
  const path = `/api/v2/band-recordings/${recordingId}/parts/${partNumber}`;
  const response = await sendPart(path, bytes);

  if (response.status === 401 && (await refreshSession())) {
    return unwrapPart(path, await sendPart(path, bytes));
  }
  return unwrapPart(path, response);
}

function sendPart(path: string, bytes: Uint8Array<ArrayBuffer>): Promise<Response> {
  const token = authToken();

  return fetch(`${env.apiUrl}${path}`, {
    method: 'PUT',
    signal: AbortSignal.timeout(PART_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/octet-stream',
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    // Приёмник ждёт сами байты: ни multipart, ни base64, ни JSON-обёртки.
    body: bytes,
  });
}

async function unwrapPart(path: string, response: Response): Promise<StoredPart> {
  const text = await response.text().catch(() => '');
  let payload: unknown = null;

  try {
    payload = text === '' ? null : JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) throw new HttpError(response.status, payload);
  return payload as StoredPart;
}
