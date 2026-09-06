import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, space, theme } from '@/shared/theme';

import { Card } from './card';
import { Stack } from './stack';
import { Text } from './text';

type IconName = keyof typeof Feather.glyphMap;

export type EmptyPanelProps = {
  icon: IconName;
  title: string;
  /** Почему пусто и что с этим делать. Пустота без объяснения читается как сбой. */
  text: string;
};

/** Панель пустого состояния: ореол с иконкой, заголовок, объяснение. */
export function EmptyPanel({ icon, title, text }: EmptyPanelProps) {
  return (
    <Card>
      <Stack gap="md" align="center">
        <View style={styles.halo}>
          <Feather name={icon} size={HALO_ICON} color={theme.color.accent.text} />
        </View>
        <Text variant="subtitle" style={styles.centered}>
          {title}
        </Text>
        <Text tone="muted" style={styles.centered}>
          {text}
        </Text>
      </Stack>
    </Card>
  );
}

const HALO = 88;
const HALO_ICON = 36;

const styles = StyleSheet.create({
  halo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.accent.surface,
    marginTop: space.sm,
  },
  centered: { textAlign: 'center' },
});
