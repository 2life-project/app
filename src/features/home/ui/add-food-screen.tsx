import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { logger } from '@/core/log/logger';
import { useToday } from '@/shared/lib/day';
import { space } from '@/shared/theme';
import {
  ActionLink,
  Button,
  Card,
  Field,
  ListRow,
  Screen,
  ScreenHeader,
  Segmented,
  Stack,
  Text,
} from '@/shared/ui';

import { analyzeText, logMeal, searchFood, type FoodHit, type MealType } from '../api/food';
import { itemMacros, kcal, portion, servingLabel, type Macros } from '../model/food';
import { ADD_FOOD, MEAL_TITLES } from '../model/food-copy';

const MODES = [
  { value: 'search', label: 'Search' },
  { value: 'text', label: 'Describe' },
] as const;

type Mode = (typeof MODES)[number]['value'];

/** Порция по умолчанию, когда у продукта её нет: сто грамм — то, к чему приведён состав. */
const DEFAULT_GRAMS = 100;

/** Шапки нет: заголовок стоит в содержимом, как на остальных экранах. */
export const AddFoodScreenOptions = { headerShown: false };

/**
 * Добавление еды в приём пищи. Два пути к одному и тому же результату:
 * найти продукт в базе или описать словами — разбор делает сервер.
 *
 * Записываем готовые числа, а не ссылку на продукт: порция уже пересчитана, и
 * запись не поедет, если карточка продукта потом изменится.
 */
export function AddFoodScreen({ meal }: { meal: string }) {
  const { date } = useToday();
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);

  const find = async () => {
    if (query.trim() === '') return;
    setBusy(true);
    setFailed(null);
    try {
      setHits(await searchFood(query.trim()));
    } catch (failure) {
      logger.warn('Поиск еды не прошёл', { failure });
      setFailed(ADD_FOOD.searchFailed);
    } finally {
      setBusy(false);
    }
  };

  const add = async (name: string, macros: Macros) => {
    setBusy(true);
    setFailed(null);
    try {
      await logMeal(date, meal as MealType, macros);
      setAdded(added + 1);
    } catch (failure) {
      logger.warn('Еда не записалась', { name, failure });
      setFailed(ADD_FOOD.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  /** Описание словами: сервер разбирает его на позиции и сразу их записываем. */
  const describe = async () => {
    if (query.trim() === '') return;
    setBusy(true);
    setFailed(null);
    try {
      const { items } = await analyzeText(query.trim());
      for (const item of items) await logMeal(date, meal as MealType, itemMacros(item));
      setAdded(added + items.length);
      setQuery('');
    } catch (failure) {
      logger.warn('Разбор описания не прошёл', { failure });
      setFailed(ADD_FOOD.analyzeFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={MEAL_TITLES[meal] ?? ADD_FOOD.title}
          subtitle={added === 0 ? ADD_FOOD.subtitle : ADD_FOOD.addedCount(added)}
          action={<ActionLink label={ADD_FOOD.done} onPress={() => router.back()} />}
        />

        <Segmented items={MODES} value={mode} onChange={setMode} />

        <Field
          label={mode === 'search' ? ADD_FOOD.searchLabel : ADD_FOOD.textLabel}
          hint={mode === 'search' ? ADD_FOOD.searchHint : ADD_FOOD.textHint}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => void (mode === 'search' ? find() : describe())}
        />

        <Button
          label={mode === 'search' ? ADD_FOOD.find : ADD_FOOD.parse}
          loading={busy}
          disabled={query.trim() === ''}
          onPress={() => void (mode === 'search' ? find() : describe())}
        />

        {failed ? (
          <Card variant="sunken">
            <Text tone="danger">{failed}</Text>
          </Card>
        ) : null}

        {mode === 'search' && hits.length > 0 ? (
          <Card>
            <Stack gap="xs">
              {hits.map((hit) => {
                const macros = portion(hit, DEFAULT_GRAMS);
                return (
                  <ListRow
                    key={hit.id}
                    title={hit.name}
                    subtitle={[hit.brand, servingLabel(hit)].filter(Boolean).join(' · ')}
                    trailing={kcal(macros.calories)}
                    onPress={() => void add(hit.name, macros)}
                  />
                );
              })}
            </Stack>
          </Card>
        ) : null}

        {mode === 'text' ? (
          <View style={styles.note}>
            <Text variant="bodySmall" tone="muted">
              {ADD_FOOD.textNote}
            </Text>
          </View>
        ) : null}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: space.xs },
});
