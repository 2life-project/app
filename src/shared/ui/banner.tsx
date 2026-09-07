import { StyleSheet, View } from 'react-native';

import { radius, space, theme, type Tone } from '@/shared/theme';

import { ActionLink } from './action-link';
import { CheckCircle } from './check-circle';
import { Text } from './text';

export type BannerProps = {
  title: string;
  subtitle?: string;
  tone?: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;
  action?: { label: string; onPress: () => void };
};

/** Плашка состояния: чек-ин пройден, синхронизация прошла, что-то требует внимания. */
export function Banner({ title, subtitle, tone = 'success', action }: BannerProps) {
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.color[tone].surface, borderColor: theme.color[tone].border },
      ]}>
      <CheckCircle checked />
      <View style={styles.body}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <ActionLink {...action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.cardX,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  body: { flex: 1, gap: 2 },
});
