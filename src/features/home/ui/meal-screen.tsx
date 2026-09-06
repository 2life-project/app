import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  ActionLink,
  ActionTile,
  Button,
  Card,
  Field,
  InfoCard,
  ListRow,
  Screen,
  ScreenHeader,
  Segmented,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import {
  FOOD_ABOUT,
  FOOD_ACTIONS,
  FOOD_TABS,
  MEAL,
  RECENT_FOODS,
  type FoodTab,
} from '../model/meal';

export const MealScreenOptions = { headerShown: false };

/** `new` — добавление еды, иначе разбор уже записанного приёма. */
export function MealScreen({ id }: { id: string }) {
  if (id === 'new') return <AddFood />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={MEAL.title}
          subtitle={MEAL.when}
          action={<ActionLink label="Edit" onPress={() => {}} />}
        />

        <Card>
          <View style={styles.macros}>
            {MEAL.macros.map((macro) => (
              <StatTile key={macro.label} {...macro} />
            ))}
          </View>
        </Card>

        <WidgetCard title="What you ate" caption={`${MEAL.items.length} items`}>
          <Stack gap="sm">
            {MEAL.items.map((item) => (
              <ListRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                trailing={item.kcal}
                trailingCaption="kcal"
                onPress={() => {}}
              />
            ))}
            <Button
              label="+ Add food"
              variant="dashed"
              onPress={() => router.push(to.meal('new'))}
            />
          </Stack>
        </WidgetCard>

        <Card>
          <Stack gap="sm" align="flex-start">
            <Text variant="subtitle">{MEAL.save.title}</Text>
            <Text tone="muted">{MEAL.save.text}</Text>
            <ActionLink label={MEAL.save.action} chevron onPress={() => {}} />
          </Stack>
        </Card>

        <InfoCard title={MEAL.about.title} text={MEAL.about.text} />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  macros: { flexDirection: 'row', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
});

/** Добавление еды: способ ввода, поиск, недавнее. */
function AddFood() {
  const [tab, setTab] = useState<FoodTab>('recent');

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Add to lunch" subtitle="12:40 · 620 kcal so far" />

        <Field label="Search" hint="Search 1.9M foods" />

        <View style={styles.actions}>
          {FOOD_ACTIONS.map((action) => (
            <ActionTile key={action.id} {...action} onPress={() => {}} />
          ))}
        </View>

        <Segmented items={FOOD_TABS} value={tab} onChange={setTab} />

        <Card>
          <Stack gap="sm">
            {RECENT_FOODS.map((food) => (
              <ListRow
                key={food.id}
                title={food.title}
                subtitle={food.portion}
                trailing={food.kcal}
                trailingCaption="kcal"
                onPress={() => {}}
              />
            ))}
          </Stack>
        </Card>

        <InfoCard title={FOOD_ABOUT.title} text={FOOD_ABOUT.text} />
      </Stack>
    </Screen>
  );
}
