import { byteAt } from './bytes';
import * as cmd from './commands';
import { WorkoutOperator, workoutCommand } from './profile';
import { intField, parseModal, type Field } from './tlv';
import type { BandTransport } from './transport';
import {
  MAX_STATE_FRAMES,
  decodeActivityStates,
  decodeSportCatalog,
  decodeWorkout,
  decodeWorkoutList,
  type ActivityState,
  type SportCatalog,
  type Workout,
  type WorkoutRef,
} from './workouts';

/**
 * Тренировки и распознанная активность.
 *
 * Занятие начинает приложение: у ES100 нет ни экрана, ни кнопки старта, а
 * группы автораспознавания движения в прошивке нет. Зато заходы активности
 * устройство размечает само — они лежат отдельным каналом и читаются `states`.
 */
export class BandWorkouts {
  constructor(private readonly transport: BandTransport) {}

  async list(from: Date, to: Date): Promise<WorkoutRef[]> {
    return decodeWorkoutList(await this.transport.request(cmd.readWorkoutList(from, to)));
  }

  async summary(id: number): Promise<Workout> {
    return decodeWorkout(await this.transport.request(cmd.readWorkoutSummary(id)));
  }

  /** Посекундный ряд тренировки: интервал пять секунд. */
  async detail(id: number, index: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutDetail(id, index)));
  }

  async pace(id: number, paceIndex: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutPace(id, paceIndex)));
  }

  /** Что прошивка умеет и что из этого включено на устройстве. */
  async catalog(): Promise<SportCatalog> {
    return decodeSportCatalog(await this.transport.request(cmd.readSportCatalog()));
  }

  /**
   * Распознанные устройством события движения — оба потока.
   *
   * Счётчик кадров спрашивается отдельно, как и у истории, и приходит одним
   * коротким кадром без терминатора: сборщик многокадровых ответов ждал бы его
   * до истечения времени.
   */
  /**
   * Начать тренировку.
   *
   * Начинает её приложение, а не браслет: кнопки старта у ES100 нет, а группы
   * автораспознавания движения в прошивке нет вовсе. Пока никто не начал,
   * устройство отвечает состоянием «не запущена».
   *
   * С этого момента браслет присылает данные раз в секунду вместо десяти —
   * пульс, шаги, дистанцию и калории, — пока не придёт `finish`.
   */
  async start(sport: number): Promise<void> {
    // Без этого устройство ведёт тренировку, но не докладывает о ней.
    await this.transport.send(cmd.writeOperatorReport(true));
    await this.command(WorkoutOperator.start, sport);
  }

  pause(sport: number): Promise<void> {
    return this.command(WorkoutOperator.pause, sport);
  }

  resume(sport: number): Promise<void> {
    return this.command(WorkoutOperator.resume, sport);
  }

  /** Завершить, отдав устройству итог: без него тренировка не сохранится. */
  finish(
    sport: number,
    total: { seconds: number; distance: number; calories: number },
  ): Promise<void> {
    return this.command(WorkoutOperator.finish, sport, total);
  }

  /** Что происходит прямо сейчас: идёт занятие, пауза или ничего. */
  async operator(): Promise<number | undefined> {
    const body = await this.transport.request(cmd.readOperatorState());
    return intField(parseModal(body), 0x02);
  }

  private async command(
    operator: number,
    sport: number,
    total?: { seconds: number; distance: number; calories: number },
  ): Promise<void> {
    const frames = workoutCommand({
      operator,
      sport,
      seconds: total?.seconds,
      distance: total?.distance,
      calories: total?.calories,
    });
    for (const frame of frames) await this.transport.send(frame);
  }

  async states(from: Date, to: Date): Promise<ActivityState[]> {
    return [
      ...(await this.readStream(from, to, 'status')),
      ...(await this.readStream(from, to, 'state')),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  private async readStream(
    from: Date,
    to: Date,
    stream: 'status' | 'state',
  ): Promise<ActivityState[]> {
    const counter =
      stream === 'status' ? cmd.readStatusCount(from, to) : cmd.readStateCount(from, to);
    const count = await this.transport.requestRaw(counter, 0xc5);
    const frames = count.length > 0 ? byteAt(count, count.length - 1) : 0;

    const states: ActivityState[] = [];
    for (let index = 0; index < Math.min(frames, MAX_STATE_FRAMES); index += 1) {
      const frame =
        stream === 'status'
          ? cmd.readStatusFrame(from, to, index)
          : cmd.readStateFrame(from, to, index);
      states.push(...decodeActivityStates(await this.transport.request(frame), stream));
    }
    return states;
  }
}
