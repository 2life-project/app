// Плоский конфиг ESLint 9. Правила делятся на три группы:
// базовая гигиена (из eslint-config-expo), границы слоёв и дисциплина токенов.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'ios/**',
      'android/**',
      'expo-env.d.ts', // генерируется Expo
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    // Плагин `import` уже зарегистрирован конфигом Expo — здесь только его правила.
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // --- гигиена ------------------------------------------------------
      'no-console': 'error',
      'unused-imports/no-unused-imports': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // --- границы слоёв ------------------------------------------------
      // Зависимости текут в одну сторону: app → features → shared → core.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: ['./src/shared', './src/features', './src/app'],
              message: 'core — нижний слой: он не знает ни о фичах, ни об экранах.',
            },
            {
              target: './src/shared',
              from: ['./src/features', './src/app'],
              message: 'shared переиспользуют все — он не может зависеть от конкретной фичи.',
            },
            {
              target: './src/features',
              from: './src/app',
              message: 'Фича не знает о роутере: экран подключает фичу, не наоборот.',
            },
          ],
        },
      ],
      // Внутренности фичи закрыты для всех: только её публичный index.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Импортируйте фичу через её публичный вход: @/features/<имя>.',
            },
          ],
        },
      ],
    },
  },
  {
    // Фича не знает о других фичах — ни через алиас, ни относительным путём.
    // Относительный путь запрещён выше корня фичи: всё, что дальше, — это
    // либо соседняя фича, либо другой слой, а другой слой берут через `@/`.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/**'],
              message: 'Фича не импортирует другую фичу. Общее уезжает в shared.',
            },
            {
              group: ['../../*', '../../**', '../../../**'],
              message: 'Выход за корень фичи. Соседняя фича закрыта, другой слой берут через @/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // --- дисциплина токенов ---------------------------------------------
    // Всё, что задаёт вид, приходит из темы. Правило держит линтер, а не ревью:
    // литерал проникает тихо и размножается копипастой быстрее, чем его ловят.
    //
    // Все селекторы живут в одном блоке намеренно: flat config не объединяет
    // `no-restricted-syntax` между блоками — последний матчащий затирает
    // предыдущие, и разнесённые правила молча выключили бы друг друга.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]',
          message: 'Цвет берётся из @/shared/theme, а не hex-литералом.',
        },
        {
          selector: "Property[key.name='fontSize'][value.type='Literal']",
          message: 'Кегль задаёт роль: <Text variant="..."> или textVariant из @/shared/theme.',
        },
        {
          selector: "Property[key.name='lineHeight'][value.type='Literal']",
          message: 'Интерлиньяж идёт в комплекте с ролью текста, отдельно его не задают.',
        },
        {
          selector: "Property[key.name='fontWeight'][value.type='Literal']",
          message: 'Начертание — из fontWeight в @/shared/theme, а не числом на месте.',
        },
        {
          selector: "Property[key.name='fontFamily'][value.type='Literal']",
          message: 'Гарнитура — из fontFamily в @/shared/theme.',
        },
        {
          selector:
            "Property[key.name=/^(margin|padding)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?$/][value.type='Literal'][value.value!=0]",
          message: 'Отступ — шаг из space в @/shared/theme. Ручные числа ломают сетку.',
        },
        {
          selector: "Property[key.name='borderRadius'][value.type='Literal']",
          message: 'Скругление — из radius в @/shared/theme.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
