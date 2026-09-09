module.exports = {
  preset: 'jest-expo',
  // Для разового прогона watchman ничего не ускоряет, а сломанный или отсутствующий
  // (CI, песочницы) роняет запуск. Jest обходит дерево сам.
  watchman: false,
  // Рабочие копии других веток лежат внутри репозитория, и Jest обходит их
  // как свои. Тесты соседней ветки к текущей отношения не имеют, а её
  // `node_modules` ещё и подменяют модули на ходу.
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/'],
  modulePathIgnorePatterns: ['/.claude/worktrees/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**'],
};
