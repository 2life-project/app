// Хранилище на диске подменяется памятью: без этого любой модуль, который
// помнит состояние между запусками, роняет тест на импорте — нативного модуля
// в тестовой среде нет. Мок официальный, из самого пакета.
jest.mock('@react-native-async-storage/async-storage', () =>
  // Фабрика `jest.mock` поднимается выше импортов файла, поэтому обычный
  // `import` здесь недоступен: на момент её вызова он ещё не выполнен.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- см. выше
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
