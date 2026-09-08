import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android 12 и новее спрашивают разрешение на поиск и подключение отдельно, и
 * без них сканирование молча возвращает пустой список — не ошибку. На iOS
 * разрешение спрашивает сама система при первом обращении к радио.
 */
export async function requestScanPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return Object.values(granted).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
}
