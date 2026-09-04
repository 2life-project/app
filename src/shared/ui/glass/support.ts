import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

/**
 * Единственная точка определения, доступно ли нативное стекло iOS 26.
 * Это возможность системы — в рантайме она не меняется, поэтому считается один
 * раз при загрузке модуля. Прямой вызов `isLiquidGlassAvailable` где-либо ещё
 * запрещён линтером: иначе детект расползётся по файлам и рассинхронизируется.
 */
export const supportsLiquidGlass: boolean = Platform.OS === 'ios' && isLiquidGlassAvailable();
