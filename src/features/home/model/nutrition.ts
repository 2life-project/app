/** Раздел «Питание» — содержимое из макета. */
export const NUTRITION_SUMMARY = [
  { id: 'meals', title: 'Meals', subtitle: 'dinner not logged', value: '3 of 4' },
  { id: 'burned', title: 'Burned', subtitle: 'kcal today', value: '2,340' },
  { id: 'water', title: 'Water', subtitle: 'of 2.5', value: '1.9 L' },
] as const;

export const MACROS = [
  { label: 'PROTEIN', value: '96', note: '/ 140 g', progress: { value: 0.69, tone: 'highlight' } },
  { label: 'CARBS', value: '182', note: '/ 230 g', progress: { value: 0.79, tone: 'warning' } },
  { label: 'FAT', value: '64', note: '/ 80 g', progress: { value: 0.8, tone: 'danger' } },
] as const;

export const MEALS = [
  {
    id: 'breakfast',
    icon: 'sun',
    title: 'Breakfast',
    subtitle: 'Oatmeal, whey, banana',
    value: '471',
  },
  { id: 'lunch', icon: 'coffee', title: 'Lunch', subtitle: 'Chicken, rice, salad', value: '620' },
  { id: 'dinner', icon: 'moon', title: 'Dinner', subtitle: 'not logged yet', value: null },
  { id: 'snack', icon: 'droplet', title: 'Snack', subtitle: 'Cottage cheese', value: '180' },
] as const;

export const CALORIES_14_DAYS = [
  2280, 2460, 2210, 2380, 2520, 2040, 2180, 2340, 2120, 2290, 2400, 2260, 2350, 1840,
] as const;

export const ABOUT_TARGET =
  '2,400 kcal is your maintenance plus today’s training load. Protein is the only macro with a hard floor — the rest float.';
