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
    files: ['**/*.{ts,tsx,js}'],
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
      // Внутренности чужой фичи закрыты: только публичный index.
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
    // Литеральные цвета живут только в палитре.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]',
          message: 'Цвет берётся из @/shared/theme, а не hex-литералом.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
