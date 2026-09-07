import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, theme, type Tone } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

export type IconTileProps = {
  name: IconName;
  /** Смысл строки: серый по умолчанию, цветной — когда он что-то значит. */
  tone?: Tone;
  /** Круг — у события дня, скруглённый квадрат — у устройства и настройки. */
  shape?: 'circle' | 'rounded';
  size?: number;
};

/** Иконка в подложке — то, что стоит слева в строке списка. */
export function IconTile({
  name,
  tone = 'neutral',
  shape = 'rounded',
  size: box = 36,
}: IconTileProps) {
  const palette = theme.color[tone];

  return (
    <View
      style={[
        styles.tile,
        {
          width: box,
          height: box,
          borderRadius: shape === 'circle' ? radius.full : radius.md,
          backgroundColor: palette.surface,
        },
      ]}>
      <Feather
        name={name}
        size={size.icon.md}
        color={tone === 'neutral' ? theme.color.textMuted : palette.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
