import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme, type Tone } from '@/shared/theme';

import { Card } from './card';
import { Pressable } from './pressable';
import { Text } from './text';

export type CalendarDay = {
  day: number;
  /**
   * Точки слоёв под числом: какие роды записей были в этот день. Цвет здесь
   * кодирует слой, а не состояние, поэтому семейства не только статусные.
   */
  dots?: Tone[];
};

export type MonthCalendarProps = {
  title: string;
  /** Дни месяца по порядку; первый элемент — первое число. */
  days: CalendarDay[];
  /** Порядковый номер дня недели, с которого начинается месяц (0 — понедельник). */
  firstWeekday: number;
  selected: number;
  onSelect: (day: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Месяц с точками слоёв под числами. Точка — не украшение: по правилу цвета
 * она несёт статус дня, а сам слой различается подписью в списке, не оттенком.
 */
export function MonthCalendar({
  title,
  days,
  firstWeekday,
  selected,
  onSelect,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const cells: (CalendarDay | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];

  return (
    <Card>
      <View style={styles.head}>
        <Pressable haptic={false} accessibilityLabel="Предыдущий месяц" onPress={onPrev}>
          <Feather name="chevron-left" size={size.icon.md} color={theme.color.textMuted} />
        </Pressable>
        <Text variant="subtitle">{title}</Text>
        <Pressable haptic={false} accessibilityLabel="Следующий месяц" onPress={onNext}>
          <Feather name="chevron-right" size={size.icon.md} color={theme.color.textMuted} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <View key={`${weekday}-${index}`} style={styles.cell}>
            <Text variant="caption" tone="muted">
              {weekday}
            </Text>
          </View>
        ))}

        {cells.map((cell, index) =>
          cell === null ? (
            <View key={`gap-${index}`} style={styles.cell} />
          ) : (
            <Pressable
              key={cell.day}
              haptic={false}
              scaleTo={0.92}
              accessibilityRole="button"
              onPress={() => onSelect(cell.day)}
              style={styles.cell}>
              <View style={[styles.date, cell.day === selected && styles.selected]}>
                <Text variant="body">{String(cell.day)}</Text>
              </View>
              <View style={styles.dots}>
                {(cell.dots ?? []).map((tone, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[styles.dot, { backgroundColor: theme.color[tone].solid }]}
                  />
                ))}
              </View>
            </Pressable>
          ),
        )}
      </View>
    </Card>
  );
}

const DOT = 5;
/** Вертикальное поле числа и зазор до точек — из макета, вне шага сетки. */
const DATE_PADDING_Y = 2;
const DOTS_GAP = 3;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md },
  // Семь колонок: ширина в долях, чтобы сетка не разъезжалась на любом экране.
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: space.xs },
  date: {
    minWidth: 30,
    paddingHorizontal: space.xs,
    paddingVertical: DATE_PADDING_Y,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  selected: { backgroundColor: theme.color.highlight.surface },
  dots: { flexDirection: 'row', gap: DOTS_GAP, height: DOT + DOTS_GAP, marginTop: DATE_PADDING_Y },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
});
