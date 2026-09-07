/** Приём пищи из макета: макросы, состав, сохранение как шаблон. */
export const MEAL = {
  title: 'Lunch',
  when: '12:40 · 620 kcal',
  macros: [
    { label: 'PROTEIN', value: '41 g', progress: { value: 0.62, tone: 'highlight' } },
    { label: 'CARBS', value: '62 g', progress: { value: 0.74, tone: 'highlight' } },
    { label: 'FAT', value: '18 g', progress: { value: 0.4, tone: 'highlight' } },
  ],
  items: [
    {
      id: 'chicken',
      title: 'Chicken breast, grilled',
      subtitle: '150 g · photo · corrected',
      kcal: '248',
    },
    { id: 'rice', title: 'Basmati rice, boiled', subtitle: '180 g · photo', kcal: '232' },
    { id: 'salad', title: 'Greek salad', subtitle: '1 bowl · barcode', kcal: '140' },
  ],
  save: {
    title: 'Eat this often?',
    text: 'Save the three items as one meal — next time it is a single tap.',
    action: 'Save as a meal',
  },
  about: {
    title: 'Where these numbers come from',
    text: 'Protein and carbs come from the recognised photo, weight from the scale in the label. Corrected items keep your correction, not the estimate.',
  },
} as const;

/** Добавление еды: способы ввода и недавние продукты из макета. */
export const FOOD_ACTIONS = [
  { id: 'photo', icon: 'camera', title: 'Photo', subtitle: 'of the plate' },
  { id: 'barcode', icon: 'maximize', title: 'Barcode', subtitle: 'scan a pack' },
  { id: 'voice', icon: 'mic', title: 'Voice', subtitle: 'say what you ate' },
] as const;

export const FOOD_TABS = [
  { value: 'recent', label: 'Recent' },
  { value: 'most', label: 'Most eaten' },
  { value: 'mine', label: 'My meals' },
] as const;

export type FoodTab = (typeof FOOD_TABS)[number]['value'];

export const RECENT_FOODS = [
  { id: 'chicken', title: 'Chicken breast, grilled', portion: '150 g', kcal: '248' },
  { id: 'rice', title: 'Basmati rice, boiled', portion: '180 g', kcal: '232' },
  { id: 'salad', title: 'Greek salad', portion: '1 bowl', kcal: '140' },
  { id: 'whey', title: 'Whey protein', portion: '1 scoop', kcal: '120' },
  { id: 'cottage', title: 'Cottage cheese 5%', portion: '200 g', kcal: '242' },
] as const;

export const FOOD_ABOUT = {
  title: 'Photo and voice are estimates',
  text: 'A photo gets the dish and the portion approximately — correct the weight and the numbers become yours, not the model’s.',
};
