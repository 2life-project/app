import Constants from 'expo-constants';

/**
 * Единственная точка чтения окружения. `process.env.EXPO_PUBLIC_*` инлайнится
 * в бандл на этапе сборки — секретов здесь быть не может, только адреса и флаги.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

if (!__DEV__ && apiUrl.includes('localhost')) {
  throw new Error('EXPO_PUBLIC_API_URL не задан: релизная сборка смотрит в localhost');
}

export const env = {
  apiUrl,
  isDev: __DEV__,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
} as const;
