import { reportFailure, request } from '@/core/http/client';

import {
  bodyProfile,
  bodyProfileLoaded,
  isUnsynced,
  LIMITS,
  markUnsynced,
  setBodyProfile,
  sexOf,
  within,
  type BodyProfile,
  type Sex,
} from './body-profile';

/**
 * Профиль тела и сервер.
 *
 * Правит человек в одном месте, а знать должны двое: сервер — потому что
 * профиль его, устройство — потому что считает по нему. Правка уходит на
 * сервер сразу; при подключении браслета телефон сверяется с сервером и
 * отдаёт устройству сведённое.
 */

/** Форма `/api/profile` в той части, которая описывает тело. */
export type ServerBody = {
  id: string;
  sex: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Профиль ещё не заполняли: сервер отдал значения по умолчанию. */
  isDefault: boolean;
};

type ServerProfile = { profile?: ServerBody };

type BodyFields = Pick<BodyProfile, 'heightCm' | 'weightKg' | 'birthDate' | 'sex'>;

const FIELDS = ['heightCm', 'weightKg', 'birthDate', 'sex'] as const;

const NOTHING: BodyFields = { heightCm: null, weightKg: null, birthDate: null, sex: null };

/**
 * Как сервер называет пол. Его словарь в спеке не описан, а старый обработчик
 * не приводит чужое слово к своему — отвергает. Поэтому запоминаем слово, с
 * которым сервер сам отдал пол, и возвращаем ему его же.
 */
const sexWords: Record<Sex, string> = { male: 'male', female: 'female' };

/** Сверка с сервером не чаще раза в час: подключений в плохой связи десятки за час. */
const SYNC_TTL_MS = 60 * 60 * 1000;

let syncedAt = 0;

/**
 * Свести то, что знает сервер, с тем, что на телефоне.
 *
 * Сервер главный: каждая правка уезжает на него сразу, и расхождение значит,
 * что человек поправил себя где-то ещё — в вебе. Пустое у сервера дозаполняет
 * телефон, и это надо отправить. Профиль «по умолчанию» — не знание, а
 * заглушка: с ним телефон главный целиком.
 */
export function mergeServerProfile(
  local: BodyProfile,
  server: ServerBody | undefined,
): { merged: BodyFields; push: boolean } {
  const known: BodyFields =
    server && !server.isDefault
      ? {
          heightCm: within(server.heightCm, LIMITS.heightCm),
          weightKg: within(server.weightKg, LIMITS.weightKg),
          birthDate: server.dateOfBirth,
          sex: sexOf(server.sex),
        }
      : NOTHING;

  const merged: BodyFields = {
    heightCm: known.heightCm ?? local.heightCm,
    weightKg: known.weightKg ?? local.weightKg,
    birthDate: known.birthDate ?? local.birthDate,
    sex: known.sex ?? local.sex,
  };
  const push = FIELDS.some((field) => known[field] === null && merged[field] !== null);
  return { merged, push };
}

function rememberSexWord(server: ServerBody | undefined): void {
  const sex = sexOf(server?.sex);
  if (sex && server?.sex) sexWords[sex] = server.sex;
}

async function pushToServer(profile: BodyProfile, id?: string): Promise<void> {
  // `PATCH` требует идентификатор профиля, а его отдаёт только `GET`.
  const profileId = id ?? (await request<ServerProfile>('/api/profile')).profile?.id;
  if (!profileId) throw new Error('сервер не отдал профиль');

  await request<unknown>('/api/profile', {
    method: 'PATCH',
    body: {
      id: profileId,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      dateOfBirth: profile.birthDate,
      sex: profile.sex ? sexWords[profile.sex] : null,
    },
  });
}

/** Номер последней правки: ответ на прежнюю не должен снимать метку с новой. */
let edition = 0;

/**
 * Сохранить правку человека: на телефон сразу, на сервер следом.
 *
 * Сервер не ответил — правка остаётся с меткой «не отправлена» и уедет при
 * следующей сверке, а до тех пор сервер её не затрёт.
 */
export function saveBodyProfile(patch: Partial<BodyProfile>): BodyProfile {
  const next = setBodyProfile(patch);
  edition += 1;
  const mine = edition;
  markUnsynced(true);

  void pushToServer(next)
    .then(() => {
      if (mine === edition) markUnsynced(false);
    })
    .catch((failure: unknown) => {
      // Ответ сервера уже записан клиентом; отказ без ответа — сеть — здесь
      // единственная запись, и в релизе она обязана быть видна.
      reportFailure('Профиль тела не ушёл на сервер', failure);
    });

  return next;
}

/**
 * Свериться с сервером: при подключении браслета, перед записью на него.
 * Неотправленная правка уезжает первой — иначе сервер затёр бы её своим.
 */
export async function syncBodyProfile(signal?: AbortSignal): Promise<BodyProfile> {
  await bodyProfileLoaded();
  try {
    if (isUnsynced()) {
      await pushToServer(bodyProfile());
      markUnsynced(false);
      return bodyProfile();
    }
    if (Date.now() - syncedAt < SYNC_TTL_MS) return bodyProfile();

    const before = edition;
    const answer = await request<ServerProfile>('/api/profile', { signal });
    rememberSexWord(answer.profile);
    // Пока ответ ехал, человек мог поправить профиль: его правка новее всего,
    // что знает сервер, и уедет своим путём — сводить её с ответом нельзя.
    if (edition !== before) return bodyProfile();

    const { merged, push } = mergeServerProfile(bodyProfile(), answer.profile);
    const next = setBodyProfile(merged);
    if (push && answer.profile) await pushToServer(next, answer.profile.id);
    syncedAt = Date.now();
    return next;
  } catch (failure) {
    // Профиль на телефоне уже есть, и жить без сервера он умеет: это сверка,
    // а не загрузка экрана. Но отказ без ответа сервера нигде больше не
    // записан — в релизе виден только он.
    reportFailure('Профиль тела не сверился с сервером', failure);
    return bodyProfile();
  }
}
