import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { logger } from '@/core/log/logger';
import { useToday } from '@/shared/lib/day';
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

/** Шапки нет: заголовок стоит в содержимом, как на остальных экранах. */
export const AddFoodScreenOptions = { headerShown: false };

const MODES = [
  { value: 'search', label: 'Search' },
  { value: 'text', label: 'Describe' },
] as const;

type Mode = (typeof MODES)[number]['value'];

/** Состав продукта приведён к 100 г — с этой порции и начинаем. */
const DEFAULT_GRAMS = 100;

/**
 * Пауза перед запросом. Меньше — и сервер получает по запросу на букву;
 * больше — и список отстаёт от набора настолько, что человек жмёт кнопку.
 */
const TYPING_PAUSE = 350;

/**
 * Запись еды. Ищем по мере набора, без кнопки «искать»: лишний шаг стоит
 * дороже, чем кажется, — еду записывают по нескольку раз в день.
 *
 * После записи говорим, что изменилось: «+220 ккал» закрывает действие и
 * избавляет от возврата на предыдущий экран ради проверки.
 */
export function AddFoodScreen({ meal }: { meal: string }) {
  const { date } = useToday();
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  /** Ответ вместе со строкой, на которую он пришёл: пока набор идёт дальше,
      старый список не показываем — он про другой запрос. */
  const [found, setFound] = useState<{ query: string; items: FoodHit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<Macros | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // Поиск идёт сам, с паузой после набора. Прошлый запрос отменяем: ответы
  // приходят не в том порядке, в каком уходили, и последний ответ может
  // оказаться на позапрошлую строку.
  useEffect(() => {
    const text = query.trim();
    if (mode !== 'search' || text === '') return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchFood(text, controller.signal)
        .then((items) => setFound({ query: text, items }))
        .catch((failure: unknown) => {
          if (!controller.signal.aborted) logger.warn('Поиск еды не прошёл', { failure });
        });
    }, TYPING_PAUSE);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, mode]);

  // Список выводим, а не храним: показывать ответ на прошлую строку — значит
  // предлагать добавить не то, что человек сейчас ищет.
  const hits = found?.query === query.trim() ? found.items : [];
  const searching = mode === 'search' && query.trim() !== '' && found?.query !== query.trim();

  const record = async (macros: Macros, count: number) => {
    setBusy(true);
    setFailed(null);
    try {
      await logMeal(date, meal as MealType, macros);
      setLogged({ ...macros, calories: (logged?.calories ?? 0) + macros.calories * count });
      setQuery('');
    } catch (failure) {
      logger.warn('Еда не записалась', { failure });
      setFailed(ADD_FOOD.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  /** Описание словами: сервер разбирает его на позиции, записываем все. */
  const describe = async () => {
    const text = query.trim();
    if (text === '') return;
    setBusy(true);
    setFailed(null);
    try {
      const { items } = await analyzeText(text);
      for (const item of items) await logMeal(date, meal as MealType, itemMacros(item));
      const total = items.reduce((sum, item) => sum + item.calories, 0);
      setLogged({ calories: (logged?.calories ?? 0) + total, protein: 0, fat: 0, carbs: 0 });
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
          subtitle={ADD_FOOD.subtitle}
          action={<ActionLink label={ADD_FOOD.done} onPress={() => router.back()} />}
        />

        <Segmented items={MODES} value={mode} onChange={setMode} />

        <Field
          label={mode === 'search' ? ADD_FOOD.searchLabel : ADD_FOOD.textLabel}
          hint={mode === 'search' ? ADD_FOOD.searchHint : ADD_FOOD.textHint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType={mode === 'search' ? 'search' : 'done'}
          onSubmitEditing={() => void (mode === 'text' ? describe() : undefined)}
          autoFocus
        />

        {/* Что изменилось после записи. Без этой строки приходится уходить на
            предыдущий экран, чтобы убедиться, что еда записалась. */}
        {logged ? (
          <Card variant="sunken">
            <Text tone="success">{ADD_FOOD.added(logged.calories)}</Text>
          </Card>
        ) : null}

        {failed ? (
          <Card variant="sunken">
            <Text tone="danger">{failed}</Text>
          </Card>
        ) : null}

        {mode === 'text' ? (
          <Stack gap="sm">
            <Button
              label={ADD_FOOD.parse}
              loading={busy}
              disabled={query.trim() === ''}
              onPress={() => void describe()}
            />
            <Text variant="bodySmall" tone="muted">
              {ADD_FOOD.textNote}
            </Text>
          </Stack>
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
                    onPress={() => void record(macros, 1)}
                  />
                );
              })}
            </Stack>
          </Card>
        ) : null}

        {mode === 'search' && !searching && query.trim() !== '' && hits.length === 0 ? (
          <Text tone="muted">{ADD_FOOD.nothingFound}</Text>
        ) : null}
      </Stack>
    </Screen>
  );
}
