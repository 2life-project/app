import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android 12 и новее спрашивают разрешение на поиск и подключение отдельно, и
 * без них сканирование молча возвращает пустой список — не ошибку. На iOS
 * разрешение спрашивает сама система при первом обращении к радио.
 */
/** С этого уровня появились отдельные разрешения Bluetooth. */
const ANDROID_12 = 31;

export async function requestScanPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  // До Android 12 разрешений BLUETOOTH_SCAN и BLUETOOTH_CONNECT не существует:
  // просить их бессмысленно, а поиск без доступа к местоположению возвращает
  // пустой список молча, без ошибки. Человек видит вечное «ищем» и ни одного
  // устройства — и никакая кнопка это не чинит.
  if (Number(Platform.Version) < ANDROID_12) {
    const location = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return location === PermissionsAndroid.RESULTS.GRANTED;
  }

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return Object.values(granted).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
}
