import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import { Pressable, Stack, Text } from '@/shared/ui';

import { MEALS, kcal, mealGoal } from '../model/food';

/**
 * Приёмы пищи одной полосой: четыре кружка, под каждым — сколько съедено.
 * Нажатие сразу ведёт к добавлению в этот приём, а не к списку списков:
 * человек открывает питание, чтобы что-то записать, а не осмотреться.
 *
 * Съеденное по приёмам сервер пока не разделяет — числа появятся, когда
 * дневная ручка начнёт отдавать записи по приёмам (см. docs/backend-gaps.md).
 */
export function MealStrip({
  eaten,
  dailyGoal,
}: {
  /** Съедено за каждый приём. Пусто — значит записей ещё нет. */
  eaten?: Partial<Record<string, number>>;
  dailyGoal: number | null;
}) {
  return (
    <View style={styles.row}>
      {MEALS.map((meal) => {
        const value = eaten?.[meal.type];
        const goal = mealGoal(dailyGoal, meal.type);
        return (
          <Pressable
            key={meal.type}
            accessibilityLabel={meal.title}
            style={styles.meal}
            onPress={() => router.push(to.addFood(meal.type))}>
            <Stack gap="xs" align="center">
              <View style={[styles.circle, value ? styles.done : null]}>
                <Text variant="subtitle">{meal.icon}</Text>
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meal.title.toUpperCase()}
              </Text>
              <Text variant="footnote" numberOfLines={1}>
                {value === undefined ? (goal === null ? '—' : kcal(goal)) : kcal(value)}
              </Text>
            </Stack>
          </Pressable>
        );
      })}
    </View>
  );
}

const CIRCLE = 48;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  meal: { flex: 1 },
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
  done: { borderColor: theme.color.success.solid, backgroundColor: theme.color.success.surface },
});
