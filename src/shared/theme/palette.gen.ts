// СГЕНЕРИРОВАНО scripts/generate-palette.mjs — не править руками.
// Пересобрать: make tokens. Рецепт оттенков живёт в самом скрипте.
//
// Ступени по шкале Radix Colors:
//  1–2  фон страницы            7–8   границы интерактивных элементов
//  3–5  фон компонента          9–10  сплошная заливка и её нажатое состояние
//  6    разделители             11–12 текст: приглушённый и основной
//  on   подпись, которая читается на ступенях 9–10 (проверено на 4.5:1)
export type ColorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ColorFamily = 'neutral' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger';
export type ColorScale = Readonly<Record<ColorStep, string> & { on: string }>;

export const scales: Readonly<Record<ColorFamily, ColorScale>> = {
  neutral: {
    1: '#fcfdfd',
    2: '#f9fafb',
    3: '#f1f3f6',
    4: '#eaedf1',
    5: '#e2e7eb',
    6: '#d9dfe4',
    7: '#cdd3da',
    8: '#b8c0c9',
    9: '#657383',
    10: '#586675',
    11: '#49525c',
    12: '#08324f',
    on: '#ffffff',
  },
  accent: {
    1: '#fbfdff',
    2: '#f6faff',
    3: '#ebf4ff',
    4: '#e0efff',
    5: '#d5e9fe',
    6: '#c9e1fa',
    7: '#b9d6f5',
    8: '#9dc3eb',
    9: '#0361a3',
    10: '#005392',
    11: '#0c3f6c',
    12: '#102132',
    on: '#ffffff',
  },
  highlight: {
    1: '#fafdff',
    2: '#f5fbff',
    3: '#e8f5fe',
    4: '#ddf0fc',
    5: '#d2eafa',
    6: '#c5e3f5',
    7: '#b4d9ef',
    8: '#97c7e4',
    9: '#2ba6e0',
    10: '#2097ce',
    11: '#2d6f92',
    12: '#182e3b',
    on: '#0b1d27',
  },
  success: {
    1: '#fbfdf9',
    2: '#f7fcf3',
    3: '#edf7e5',
    4: '#e4f2d8',
    5: '#dcedcc',
    6: '#d1e6be',
    7: '#c3ddab',
    8: '#abcc8b',
    9: '#8fd12a',
    10: '#83c228',
    11: '#4f7519',
    12: '#223113',
    on: '#161d0e',
  },
  warning: {
    1: '#fefcf9',
    2: '#fdf9f2',
    3: '#fbf2e2',
    4: '#f7ecd4',
    5: '#f4e5c6',
    6: '#eedcb7',
    7: '#e6d0a3',
    8: '#d9bc7f',
    9: '#ffc53d',
    10: '#f1b600',
    11: '#836200',
    12: '#36290c',
    on: '#211909',
  },
  danger: {
    1: '#fffcfb',
    2: '#fff8f7',
    3: '#ffefec',
    4: '#ffe6e2',
    5: '#ffddd7',
    6: '#fdd3cb',
    7: '#f8c4bb',
    8: '#efaca1',
    9: '#e5533d',
    10: '#c95141',
    11: '#994c41',
    12: '#3f221e',
    on: '#271512',
  },
};
