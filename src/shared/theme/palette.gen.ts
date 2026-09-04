// СГЕНЕРИРОВАНО scripts/generate-palette.mjs — не править руками.
// Пересобрать: make tokens. Рецепт оттенков живёт в самом скрипте.
//
// Ступени по шкале Radix Colors:
//  1–2  фон страницы            7–8   границы интерактивных элементов
//  3–5  фон компонента          9–10  сплошная заливка и её нажатое состояние
//  6    разделители             11–12 текст: приглушённый и основной
//  on   подпись, которая читается на ступенях 9–10 (проверено на 4.5:1)
export type ColorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ColorFamily = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ColorScale = Readonly<Record<ColorStep, string> & { on: string }>;

export const scales: Readonly<Record<ColorFamily, ColorScale>> = {
  neutral: {
    1: '#fcfdfd',
    2: '#f9fafb',
    3: '#f1f3f5',
    4: '#eaedf0',
    5: '#e3e7ea',
    6: '#dbdee2',
    7: '#ced3d8',
    8: '#bac0c6',
    9: '#68737e',
    10: '#5b6671',
    11: '#4b5259',
    12: '#292c2e',
    on: '#ffffff',
  },
  accent: {
    1: '#f9fdff',
    2: '#f3fbff',
    3: '#e5f7fe',
    4: '#d8f2fd',
    5: '#cbecfa',
    6: '#bde5f6',
    7: '#aadcf0',
    8: '#87cae5',
    9: '#007fa1',
    10: '#007190',
    11: '#005c75',
    12: '#0f303c',
    on: '#ffffff',
  },
  success: {
    1: '#fbfdfb',
    2: '#f6fcf6',
    3: '#eaf7ec',
    4: '#e0f3e3',
    5: '#d6eeda',
    6: '#cae7cf',
    7: '#baddc0',
    8: '#9ecda7',
    9: '#138840',
    10: '#007a36',
    11: '#236135',
    12: '#1c3120',
    on: '#ffffff',
  },
  warning: {
    1: '#fefcf9',
    2: '#fdf9f3',
    3: '#faf2e4',
    4: '#f7ebd7',
    5: '#f3e4ca',
    6: '#eedcbc',
    7: '#e6d0a9',
    8: '#d8bb88',
    9: '#f4b93c',
    10: '#e4ab2d',
    11: '#846113',
    12: '#362911',
    on: '#221909',
  },
  danger: {
    1: '#fffcfb',
    2: '#fff8f7',
    3: '#ffefed',
    4: '#ffe6e3',
    5: '#ffddd9',
    6: '#ffd2cc',
    7: '#fac3bc',
    8: '#f1aba2',
    9: '#cd4840',
    10: '#bc3b35',
    11: '#8c3b34',
    12: '#40221e',
    on: '#ffffff',
  },
};
