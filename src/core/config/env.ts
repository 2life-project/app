import Constants from 'expo-constants';

/**
 * Единственная точка чтения окружения. `process.env.EXPO_PUBLIC_*` инлайнится
 * в бандл на этапе сборки — секретов здесь быть не может, только адреса и флаги.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * В релизе адрес обязан быть по https. Проверка на слово «localhost» ловила бы
 * только забытый дев-адрес и молча пропускала `http://api...` или адрес
 * ноутбука в локальной сети — медицинские данные ушли бы открытым текстом.
 */
if (!__DEV__ && !apiUrl.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL должен быть https, получено: ${apiUrl}`);
}

export const env = {
  apiUrl,
  isDev: __DEV__,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
} as const;
