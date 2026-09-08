import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { size, space } from '@/shared/theme';
import { Pressable, ProgressBar, ProgressRing, Stack, Text } from '@/shared/ui';

import { MEALS, kcal, mealGoal, share } from '../model/food';

/**
 * Приёмы пищи полосой: кольцо с едой внутри, под ним — сколько съедено из
 * цели этого приёма. Нажатие ведёт прямо к записи еды, а не на промежуточный
 * список: человек открывает питание, чтобы записать, а не осмотреться.
 *
 * Дуга рисуется только там, где известно съеденное. Сервер пока отдаёт итог
 * за день, но не разбивку по приёмам, поэтому у приёмов кольцо остаётся
 * дорожкой — доля, которой никто не считал, здесь не появится.
 */
export function MealStrip({
  eaten,
  eatenToday,
  dailyGoal,
}: {
  /** Съедено за каждый приём. Пусто — сервер разбивку ещё не отдаёт. */
  eaten?: Partial<Record<string, number>>;
  /** Съедено за день целиком: это сервер знает и сейчас. */
  eatenToday?: number | null;
  dailyGoal: number | null;
}) {
  const total = share(dailyGoal, eatenToday ?? 0);

  return (
    <Stack gap="md">
      <View style={styles.row}>
        {MEALS.map((meal) => {
          const goal = mealGoal(dailyGoal, meal.type);
          const value = eaten?.[meal.type];
          return (
            <Pressable
              key={meal.type}
              accessibilityLabel={meal.title}
              haptic={false}
              scaleTo={0.96}
              style={styles.meal}
              onPress={() => router.push(to.addFood(meal.type))}>
              <Stack gap="xs" align="center">
                <ProgressRing
                  size={RING}
                  thickness={THICKNESS}
                  value={value === undefined || goal === null ? null : share(goal, value)}
                  valueLabel={meal.icon}
                />
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {meal.title.toUpperCase()}
                </Text>
                <Text variant="footnote" numberOfLines={1}>
                  {value === undefined
                    ? goal === null
                      ? '—'
                      : kcal(goal)
                    : `${Math.round(value)} / ${goal ?? '—'}`}
                </Text>
              </Stack>
            </Pressable>
          );
        })}
      </View>

      {/* Итог дня сервер знает уже сейчас — он и держит полосу. */}
      {total === null ? null : (
        <Stack gap="xs">
          <ProgressBar value={total} tone="highlight" />
          <Stack direction="row" justify="space-between">
            <Text variant="footnote" tone="muted">
              {TOTAL_LABEL}
            </Text>
            <Text variant="footnote" tone="muted">
              {`${Math.round(eatenToday ?? 0)} / ${dailyGoal ?? '—'} kcal`}
            </Text>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

const TOTAL_LABEL = 'TODAY';
const RING = 44;
const THICKNESS = 4;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  meal: { flex: 1, paddingVertical: space.xs, minHeight: size.tapTarget },
});
