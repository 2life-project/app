module.exports = {
  preset: 'jest-expo',
  // Для разового прогона watchman ничего не ускоряет, а сломанный или отсутствующий
  // (CI, песочницы) роняет запуск. Jest обходит дерево сам.
  watchman: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**'],
};
