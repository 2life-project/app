import * as danger from './danger';
import type { BandTransport } from './transport';

/**
 * Необратимые операции.
 *
 * Отдельным входом намеренно: перепутать «синхронизировать» и «стереть всё»
 * не должно быть возможно по опечатке в имени метода. Каждая из этих команд
 * подтверждения на устройстве не спрашивает и выполняется немедленно.
 */
export class BandAdmin {
  constructor(private readonly transport: BandTransport) {}

  /**
   * Снять привязку: браслет забывает аккаунт и становится доступен другому
   * телефону. Данные на нём остаются.
   */
  async unbind(): Promise<void> {
    await this.transport.send(danger.unbind());
    await this.transport.send(danger.clearAccount());
  }

  /** Запросить сопряжение заново — после отвязки. */
  requestPairing(): Promise<void> {
    return this.transport.send(danger.requestPairing());
  }

  /** Отвязать подсистему диктофона. Записи при этом остаются на устройстве. */
  unbindRecorder(): Promise<void> {
    return this.transport.send(danger.unbindRecorder());
  }

  /**
   * Пароль на устройство: шесть цифр, пустой список снимает. Забытый пароль
   * снимается только заводским сбросом — другого пути прошивка не даёт.
   */
  setPassword(digits: readonly number[]): Promise<void> {
    return this.transport.send(danger.setPassword(digits));
  }

  /** Стирает настройки и данные на браслете. История не восстанавливается. */
  factoryReset(): Promise<void> {
    return this.transport.send(danger.factoryReset());
  }

  /** Стирает все голосовые записи на устройстве. */
  eraseRecordings(): Promise<void> {
    return this.transport.send(danger.recorderFactoryReset());
  }
}
