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
  Sheet,
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
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (id === 'new') return <AddFood />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={MEAL.title}
          subtitle={MEAL.when}
          action={<ActionLink label="Edit" onPress={() => setEditing(MEAL.items[0].id)} />}
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
                onPress={() => setEditing(item.id)}
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
            <ActionLink label={MEAL.save.action} chevron onPress={() => setSaving(true)} />
          </Stack>
        </Card>

        <InfoCard title={MEAL.about.title} text={MEAL.about.text} />
      </Stack>

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={MEAL.items.find((item) => item.id === editing)?.title ?? 'Item'}
        action={<ActionLink label="Done" onPress={() => setEditing(null)} />}>
        <Stack gap="md">
          <Field label="Portion" hint="150 g" />
          <Field label="Calories" hint="248 kcal" />
          <Text variant="footnote" tone="muted">
            A corrected item keeps your correction — the estimate is not applied again.
          </Text>
        </Stack>
      </Sheet>

      <Sheet
        visible={saving}
        onClose={() => setSaving(false)}
        title={MEAL.save.title}
        action={<ActionLink label="Cancel" onPress={() => setSaving(false)} />}>
        <Stack gap="md">
          <Field label="Name" hint="Chicken, rice and salad" />
          <Button label="Save as a meal" onPress={() => setSaving(false)} />
        </Stack>
      </Sheet>
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
  const [method, setMethod] = useState<string | null>(null);
  const chosen = FOOD_ACTIONS.find((action) => action.id === method);

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Add to lunch" subtitle="12:40 · 620 kcal so far" />

        <Field
          label="Search"
          hint={chosen ? `${chosen.title} — ${chosen.subtitle}` : 'Search 1.9M foods'}
        />

        <View style={styles.actions}>
          {FOOD_ACTIONS.map((action) => (
            <ActionTile key={action.id} {...action} onPress={() => setMethod(action.id)} />
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
                onPress={() => router.back()}
              />
            ))}
          </Stack>
        </Card>

        <InfoCard title={FOOD_ABOUT.title} text={FOOD_ABOUT.text} />
      </Stack>
    </Screen>
  );
}
