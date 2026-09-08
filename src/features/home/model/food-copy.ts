/** Тексты добавления еды. Экрана в макете нет — формулировки рабочие. */
export const MEAL_TITLES: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const ADD_FOOD = {
  title: 'Add food',
  subtitle: 'search the base or describe it in your own words',
  addedCount: (count: number) => `${count} added — keep going or tap Done`,
  searchLabel: 'What did you eat',
  searchHint: 'bread, cucumber, chicken…',
  textLabel: 'Describe the meal',
  textHint: 'a bowl of soup and two slices of bread',
  /** Разбор словами делает сервер, и он ошибается — об этом надо сказать. */
  textNote:
    'The description is parsed on the server and lands as separate items. Check the numbers afterwards — a guess from words is still a guess.',
  find: 'Search',
  parse: 'Add from description',
  done: 'Done',
  searchFailed: 'The search did not run. Try again.',
  saveFailed: 'It did not save. Try again.',
  analyzeFailed: 'The description was not parsed. Try simpler wording.',
} as const;
