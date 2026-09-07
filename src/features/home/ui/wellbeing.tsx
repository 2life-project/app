import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { space } from '@/shared/theme';
import {
  Banner,
  Card,
  DatePager,
  InfoCard,
  LineChart,
  LinkCard,
  SectionCaption,
  SectionSummary,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { checkinKey, fetchCheckin } from '../api/checkin';
import type { HomeData } from '../api/contract';
import { checkinCaption, wellbeingOf } from '../model/wellbeing';

const FORM = 'short';

export function Wellbeing({
  home,
  date,
  timeZone,
}: {
  home: HomeData;
  date: string;
  timeZone: string;
}) {
  // Анкета лежит отдельно от ленты: её перечитывают после ответа, а не вместе
  // со всей Главной.
  const checkin = useQuery(checkinKey(date, timeZone, FORM), (signal) =>
    fetchCheckin(date, timeZone, FORM, signal),
  );
  const view = wellbeingOf(home);

  if (!view) {
    return (
      <Stack gap="md">
        <DatePager label={`Today · ${shortDay(home.date)}`} />
        <Card variant="sunken">
          <Text tone="muted">Wellbeing data did not load for this day.</Text>
        </Card>
      </Stack>
    );
  }

  const progress = checkin.data?.progress;
  const done = progress !== undefined && progress.completed >= progress.total;

  return (
    <Stack gap="md">
      <DatePager label={`Today · ${shortDay(home.date)}`} />

      <SectionSummary
        title="Wellbeing"
        action={{ label: 'Check-in', chevron: true, onPress: () => router.push(to.checkIn()) }}
        caption={<SectionCaption>{view.caption}</SectionCaption>}
        ring={view.ring}
        rows={view.rows.map((row) => ({ ...row, onPress: () => router.push(to.checkIn()) }))}
      />

      {progress ? (
        <Banner
          tone={done ? 'success' : 'highlight'}
          checked={done}
          title={done ? 'Today’s check-in is done' : 'Check-in is not finished'}
          subtitle={checkinCaption(checkin.data)}
          action={{ label: done ? 'Edit' : 'Finish', onPress: () => router.push(to.checkIn()) }}
        />
      ) : null}

      {view.factors.length > 0 ? (
        <WidgetCard title="What it is made of">
          <View style={styles.parts}>
            {view.factors.map((factor) => (
              <StatTile key={factor.label} {...factor} />
            ))}
          </View>
        </WidgetCard>
      ) : null}

      {/* График рисуется только когда есть что рисовать: линия по одной точке
          или по пустому ряду показывает уверенность, которой нет. */}
      {view.series.length > 1 ? (
        <WidgetCard title="Day score · 7 days">
          <LineChart values={view.series} />
        </WidgetCard>
      ) : null}

      <InfoCard title={view.recommendation.title} text={view.recommendation.text} />

      {view.recommendation.actions.length > 0 ? (
        <WidgetCard title="What to do today">
          <Stack gap="sm">
            {view.recommendation.actions.map((action) => (
              <Text key={action} tone="muted">
                {action}
              </Text>
            ))}
          </Stack>
        </WidgetCard>
      ) : null}

      <LinkCard label="More charts" onPress={() => router.push(to.metric('mood'))} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  parts: { flexDirection: 'row', gap: space.sm },
});
