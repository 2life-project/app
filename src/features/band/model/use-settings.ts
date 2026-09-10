import { useCallback, useState, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';

import type { Band } from '../api';
import type { BandSettings, DeviceSettings } from '../api/settings';

/**
 * Настройки устройства.
 *
 * Читаются по требованию: полное чтение — это два десятка обменов подряд, и
 * платить за них при каждом открытии раздела незачем. Хранить прочитанное
 * между запусками тоже нельзя — человек мог поменять настройку с другого
 * телефона или в программе производителя, и показывать свою память вместо
 * состояния устройства значит врать.
 */

export type DeviceSettingsState = {
  settings: DeviceSettings | null;
  busy: boolean;
  problem: 'read' | 'write' | null;
  load: () => Promise<void>;
  /** Записать одну настройку. `optimistic` — как изменится ответ устройства. */
  write: (
    run: (api: BandSettings) => Promise<void>,
    optimistic: Partial<DeviceSettings>,
  ) => Promise<boolean>;
};

export function useDeviceSettings(bandRef: MutableRefObject<Band | null>): DeviceSettingsState {
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'read' | 'write' | null>(null);

  const load = useCallback(async () => {
    const band = bandRef.current;
    if (!band) return;

    setBusy(true);
    setProblem(null);
    try {
      setSettings(await band.settings.read());
    } catch (failure) {
      logger.warn('band: настройки не прочитались', { reason: String(failure) });
      setProblem('read');
    } finally {
      setBusy(false);
    }
  }, [bandRef]);

  const write = useCallback(
    async (run: (api: BandSettings) => Promise<void>, optimistic: Partial<DeviceSettings>) => {
      const band = bandRef.current;
      if (!band) return false;

      // Переключатель встаёт сразу, до ответа радио: обмен идёт до секунды, и
      // всё это время тумблер под пальцем стоял бы в старом положении.
      //
      // Прежние значения снимаются здесь же, внутри правки состояния, и только
      // по тронутым полям: снимок «всего, что было» откатывал бы заодно
      // соседнюю настройку, которую человек успел переключить следом.
      let rollback: Partial<DeviceSettings> = {};
      setSettings((current) => {
        if (!current) return current;
        rollback = Object.fromEntries(
          Object.keys(optimistic).map((key) => [key, current[key as keyof DeviceSettings]]),
        );
        return { ...current, ...optimistic };
      });
      setProblem(null);

      try {
        await run(band.settings);
        return true;
      } catch (failure) {
        // Откат обязателен: иначе экран показывает включённым то, что на
        // устройстве осталось выключенным, и разойдутся они навсегда —
        // перечитать настройки человек сам не догадается.
        logger.warn('band: настройка не записалась', { reason: String(failure) });
        setSettings((current) => (current ? { ...current, ...rollback } : current));
        setProblem('write');
        return false;
      }
    },
    [bandRef],
  );

  return { settings, busy, problem, load, write };
}
