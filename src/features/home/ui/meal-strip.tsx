import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import { Pressable, Stack, Text } from '@/shared/ui';

import { MEALS, kcal, mealGoal } from '../model/food';

/**
 * Приёмы пищи полосой: кружок с едой, под ним цель этого приёма. Нажатие
 * ведёт прямо к записи, а не на промежуточный список.
 *
 * Колец здесь нет намеренно: доли живут в сетке макросов над полосой, и
 * дублировать их вторым набором дуг значит заставить сверять числа между
 * собой.
 */
export function MealStrip({
  eaten,
  dailyGoal,
}: {
  /** Съедено за каждый приём. Пусто — сервер разбивку ещё не отдаёт. */
  eaten?: Partial<Record<string, number>>;
  dailyGoal: number | null;
}) {
  return (
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
              <View style={styles.circle}>
                <Text variant="subtitle">{meal.icon}</Text>
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meal.title.toUpperCase()}
              </Text>
              <Text variant="footnote" tone="muted" numberOfLines={1}>
                {value === undefined ? (goal === null ? '—' : kcal(goal)) : kcal(value)}
              </Text>
            </Stack>
          </Pressable>
        );
      })}
    </View>
  );
}

const CIRCLE = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  meal: { flex: 1, minHeight: size.tapTarget },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: size.border,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceInner,
  },
});
