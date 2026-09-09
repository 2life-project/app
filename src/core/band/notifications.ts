import { type NotificationKind, notification, notificationConfig } from './outbound';
import type { BandTransport } from './transport';

export { NotificationKind } from './outbound';

/**
 * Уведомления на браслет.
 *
 * Экрана у ES100 нет: до человека дойдёт вибрация и светодиод. Текст всё равно
 * передаётся — по типу уведомления прошивка выбирает рисунок вибрации, и без
 * него звонок неотличим от сообщения.
 */
export class BandNotifications {
  constructor(private readonly transport: BandTransport) {}

  /** Разрешить устройству реагировать на звонки и сообщения. */
  async configure(calls: boolean, messages: boolean): Promise<void> {
    for (const frame of notificationConfig(calls, messages)) await this.transport.send(frame);
  }

  async push(options: {
    kind: (typeof NotificationKind)[keyof typeof NotificationKind];
    title: string;
    body: string;
    application?: string;
  }): Promise<void> {
    for (const frame of notification(options)) await this.transport.send(frame);
  }
}
