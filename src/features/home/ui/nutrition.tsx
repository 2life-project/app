import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import {
  BarChart,
  Button,
  Card,
  DatePager,
  InfoCard,
  LinkCard,
  ListRow,
  ProgressRing,
  Stack,
  StatTile,
  SummaryRow,
  Text,
  WidgetCard,
} from '@/shared/ui';

import {
  ABOUT_TARGET,
  CALORIES_14_DAYS,
  MACROS,
  MEALS,
  NUTRITION_SUMMARY,
} from '../model/nutrition';

export function Nutrition() {
  return (
    <Stack gap="md">
      <DatePager label="Today · July 13" />

      <WidgetCard
        title="Nutrition"
        action={{ label: 'Change', chevron: true, onPress: () => router.push(to.meal('target')) }}>
        <Stack gap="md">
          <Text variant="caption" tone="muted">
            CALORIES · 560 kcal left
          </Text>
          <View style={styles.body}>
            <ProgressRing
              size={132}
              thickness={12}
              value={1840 / 2400}
              valueLabel="1,840"
              note="of 2,400"
              valueVariant="headline"
            />
            <View style={styles.summary}>
              {NUTRITION_SUMMARY.map((row, index) => (
                <SummaryRow
                  key={row.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  value={row.value}
                  divider={index > 0}
                  onPress={() => router.push(to.meal(row.id))}
                />
              ))}
            </View>
          </View>
        </Stack>
      </WidgetCard>

      <Card>
        <View style={styles.macros}>
          {MACROS.map((macro) => (
            <StatTile key={macro.label} {...macro} />
          ))}
        </View>
      </Card>

      <WidgetCard title="Meals" action={{ label: '1,840 kcal', onPress: () => {} }}>
        <Stack gap="sm">
          {MEALS.map((meal) => (
            <ListRow
              key={meal.id}
              leading={
                <View style={styles.icon}>
                  <Feather name={meal.icon} size={size.icon.md} color={theme.color.textMuted} />
                </View>
              }
              title={meal.title}
              subtitle={meal.subtitle}
              trailing={meal.value ?? undefined}
              trailingCaption={meal.value ? 'kcal' : undefined}
              trailingSlot={
                meal.value ? undefined : (
                  <Button
                    label="+ Add"
                    variant="tonal"
                    size="sm"
                    onPress={() => router.push(to.meal('new'))}
                  />
                )
              }
              onPress={meal.value ? () => router.push(to.meal(meal.id)) : undefined}
            />
          ))}
        </Stack>
      </WidgetCard>

      <WidgetCard title="Calories · 14 days" action={{ label: 'avg 2,180', onPress: () => {} }}>
        <BarChart values={CALORIES_14_DAYS} highlightIndex={CALORIES_14_DAYS.length - 1} />
      </WidgetCard>

      <InfoCard
        title="About your target"
        text={ABOUT_TARGET}
        link={{ label: 'Learn more', onPress: () => router.push(to.metric('calories')) }}
      />

      <LinkCard label="More charts" onPress={() => router.push(to.metric('calories'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  summary: { flex: 1 },
  macros: { flexDirection: 'row', gap: space.sm },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: theme.color.neutral.surface,
  },
});
