import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  BarChart,
  Button,
  Card,
  DatePager,
  IconTile,
  InfoCard,
  LinkCard,
  ListRow,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
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

      <SectionSummary
        title="Nutrition"
        action={{ label: 'Change', chevron: true, onPress: () => router.push(to.meal('target')) }}
        caption={<SectionCaption>CALORIES · 560 kcal left</SectionCaption>}
        ring={{ value: 1840 / 2400, valueLabel: '1,840', note: 'of 2,400' }}
        rows={NUTRITION_SUMMARY.map((row) => ({
          ...row,
          onPress: () => router.push(to.meal(row.id)),
        }))}
      />

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
              leading={<IconTile name={meal.icon} shape="circle" />}
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
});
