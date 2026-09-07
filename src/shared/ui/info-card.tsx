import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { size, space, theme } from '@/shared/theme';

import { ActionLink } from './action-link';
import { Card } from './card';
import { Text } from './text';

export type InfoCardProps = {
  title: string;
  text: string;
  link?: { label: string; onPress: () => void };
};

/** Объяснение показателя: что это и как читать. Внизу экрана, а не над данными. */
export function InfoCard({ title, text, link }: InfoCardProps) {
  return (
    <Card variant="flat" style={styles.card}>
      <View style={styles.header}>
        <Feather name="info" size={size.icon.md} color={theme.color.textMuted} />
        <Text variant="subtitle">{title}</Text>
      </View>
      <Text tone="muted">{text}</Text>
      {link ? <ActionLink {...link} chevron /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
