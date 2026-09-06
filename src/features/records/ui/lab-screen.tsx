import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Button,
  Card,
  InfoCard,
  LineChart,
  ListRow,
  Screen,
  ScreenHeader,
  Stack,
  StatTile,
  Tag,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { MARKER } from '../model/marker';

export const LabScreenOptions = { headerShown: false };

/** Показатель биохимии: значение против цели, динамика, измерения, связи. */
export function LabScreen({ id: _id }: { id: string }) {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={MARKER.title} subtitle={MARKER.subtitle} />

        <Card>
          <Stack gap="md">
            <Stack direction="row" justify="space-between" align="center">
              <Stack direction="row" gap="xs" align="baseline">
                <Text variant="display">{MARKER.value}</Text>
                <Text variant="bodySmall" tone="muted">
                  {MARKER.unit}
                </Text>
              </Stack>
              <Tag label={MARKER.status} tone="warning" dot />
            </Stack>

            {/* Шкала показывает, где значение стоит между целью и верхом
                референса: число без шкалы не говорит, много это или мало. */}
            <View>
              <View style={styles.scale}>
                <View style={[styles.zone, styles.zoneLow, { flex: MARKER.scale.low }]} />
                <View style={[styles.zone, styles.zoneMid, { flex: MARKER.scale.mid }]} />
                <View style={[styles.zone, styles.zoneHigh, { flex: MARKER.scale.high }]} />
              </View>
              <View style={[styles.marker, { left: `${MARKER.scale.at * 100}%` }]} />
            </View>

            <Stack direction="row" justify="space-between">
              <Text variant="footnote" tone="muted">
                {MARKER.scale.from}
              </Text>
              <Text variant="footnote" tone="muted">
                {MARKER.scale.goal}
              </Text>
              <Text variant="footnote" tone="muted">
                {MARKER.scale.to}
              </Text>
            </Stack>
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">{MARKER.target.title}</Text>
            <View style={styles.tiles}>
              <StatTile {...MARKER.target.reference} />
              <StatTile {...MARKER.target.goal} />
            </View>
            <Text tone="muted">{MARKER.target.text}</Text>
          </Stack>
        </Card>

        <WidgetCard title={MARKER.dynamics.title} caption={MARKER.dynamics.caption}>
          <LineChart values={MARKER.dynamics.values} tone="warning" />
        </WidgetCard>

        <WidgetCard title="Latest measurements">
          <Stack gap="sm">
            {MARKER.measurements.map((measurement) => (
              <ListRow
                key={measurement.id}
                title={measurement.date}
                subtitle={measurement.source}
                trailing={measurement.value}
              />
            ))}
          </Stack>
        </WidgetCard>

        <WidgetCard title="Linked to">
          <Stack direction="row" gap="sm" wrap>
            {MARKER.linked.map((link) => (
              <Button
                key={link.id}
                label={link.label}
                variant="tonal"
                size="sm"
                onPress={() =>
                  router.push(link.to === 'protocol' ? to.protocol(link.id) : to.protocols())
                }
              />
            ))}
          </Stack>
        </WidgetCard>

        <InfoCard
          title={MARKER.about.title}
          text={MARKER.about.text}
          link={{ label: 'Learn more', onPress: () => {} }}
        />

        <Card variant="flat">
          <ActionLink label="All measurements and sources" chevron onPress={() => {}} />
        </Card>
      </Stack>
    </Screen>
  );
}

const SCALE_HEIGHT = 12;
const MARKER_SIZE = 14;

const styles = StyleSheet.create({
  scale: { flexDirection: 'row', gap: 2, height: SCALE_HEIGHT },
  zone: { height: SCALE_HEIGHT, borderRadius: radius.full },
  zoneLow: { backgroundColor: theme.color.success.solid },
  zoneMid: { backgroundColor: theme.color.warning.solid },
  zoneHigh: { backgroundColor: theme.color.danger.solid },
  marker: {
    position: 'absolute',
    top: -1,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginLeft: -MARKER_SIZE / 2,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: theme.color.text,
    backgroundColor: theme.color.background,
  },
  tiles: { flexDirection: 'row', gap: space.sm },
});
