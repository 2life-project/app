module.exports = {
  preset: 'jest-expo',
  // Для разового прогона watchman ничего не ускоряет, а сломанный или отсутствующий
  // (CI, песочницы) роняет запуск. Jest обходит дерево сам.
  watchman: false,
  // Рабочие копии других веток лежат внутри репозитория, и Jest обходит их
  // как свои. Тесты соседней ветки к текущей отношения не имеют, а её
  // `node_modules` ещё и подменяют модули на ходу.
  //
  // Путь считается от корня прогона, а не абсолютным куском: без `<rootDir>`
  // правило выкашивало и сам прогон изнутри рабочей копии — там этот кусок
  // есть в каждом пути, и Jest не находил ни одного теста.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**'],
};
