import { router } from 'expo-router';

import { to } from '@/shared/nav';
import { Button, Card, EmptyPanel, Screen, ScreenHeader, Stack, Text } from '@/shared/ui';

import { MEAL_TITLES } from '../model/food-copy';

import { MealStrip } from './meal-strip';

export const MealScreenOptions = { headerShown: false };

/**
 * Приём пищи. Записать еду сервер умеет, а вернуть записанное — нет:
 * `GET /api/daily/{date}` в спеке не описан (docs/backend-gaps.md §1).
 *
 * Поэтому экран не показывает состав приёма. Раньше здесь стоял макет, и он
 * выдавал один и тот же обед для любого адреса — то есть показывал человеку
 * чужую еду как его собственную.
 */
export function MealScreen({ id }: { id: string }) {
  if (id === 'new') return <PickMeal />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={MEAL_TITLES[id] ?? 'Meal'} subtitle="no details yet" />
        <EmptyPanel
          icon="inbox"
          title="This meal cannot be opened yet"
          text="The server records what you eat but does not return the day back. Until it does, only the totals on Home are real."
        />
        <Button label="Add food to this meal" onPress={() => router.push(to.addFood(id))} />
      </Stack>
    </Screen>
  );
}

/** Куда записать. Раньше «добавить еду» из журнала вело в макет формы. */
function PickMeal() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Add food" subtitle="pick the meal" />
        <Card>
          <MealStrip dailyGoal={null} />
        </Card>
        <Text variant="bodySmall" tone="muted">
          Search the base or describe the meal in your own words — the server parses it.
        </Text>
      </Stack>
    </Screen>
  );
}
