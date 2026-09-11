import { logger } from '@/core/log/logger';

import { type ActivitySample, decodeActivityFrame } from './activity';
import { byteAt } from './bytes';
import * as cmd from './commands';
import { decodeStress, type StressDay } from './health';
import { groupSleep, type SleepSession } from './sleep';
import { decodeSleep } from './sleep-stages';
import { type BandTransport } from './transport';

/**
 * Потолок кадров истории за один запрос. Сутки по минутам не дают больше сотни
 * кадров, и всё, что выше, — испорченный ответ, а не длинный день.
 */
const MAX_HISTORY_FRAMES = 120;

/**
 * Архив устройства: то, что накопилось за период, а не приходит отчётом.
 *
 * Отдельным входом, как и остальные разделы: поминутная выгрузка с её
 * счётчиком кадров и потерями занимала в фасаде столько же, сколько всё
 * подключение.
 */
export class BandHistory {
  constructor(private readonly transport: BandTransport) {}

  async sleep(from: Date, to: Date): Promise<SleepSession[]> {
    return groupSleep(decodeSleep(await this.transport.request(cmd.readSleep(from, to))));
  }

  async stress(from: Date, to: Date): Promise<StressDay[]> {
    return decodeStress(await this.transport.request(cmd.readStress(from, to)));
  }

  /**
   * Поминутная история за период. Устройство отдаёт её кадрами, поэтому сначала
   * спрашиваем их количество, потом забираем по одному.
   */
  async minutes(from: Date, to: Date): Promise<ActivitySample[]> {
    // Счётчик отвечает одним коротким кадром без терминатора — сборщик
    // многокадровых ответов ждал бы его до истечения времени.
    const countBody = await this.transport.requestRaw(cmd.readActivityCount(from, to), 0xc5);
    const declared = countBody.length > 0 ? byteAt(countBody, countBody.length - 1) : 0;

    // Кадров не бывает больше суток по минутам, а число приходит одним байтом:
    // сбитый ответ превращается в две с половиной сотни запросов по двенадцать
    // секунд каждый — раздел на такое время просто перестаёт отвечать.
    const frames = Math.min(declared, MAX_HISTORY_FRAMES);
    if (declared > frames) {
      logger.warn('band: устройство заявило слишком много кадров', { declared });
    }

    const samples: ActivitySample[] = [];
    for (let index = 0; index < frames; index += 1) {
      try {
        const body = await this.transport.request(cmd.readActivityFrame(from, to, index));
        samples.push(...decodeActivityFrame(body).samples);
      } catch (error) {
        // Один потерянный кадр не повод бросать всю выгрузку: остальные дни
        // важнее, а пропуск виден по разрыву во времени.
        logger.warn('band: кадр истории не пришёл', { index, reason: String(error) });
      }
    }

    return samples;
  }
}
