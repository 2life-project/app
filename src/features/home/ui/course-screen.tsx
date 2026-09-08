import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { shortDay, useToday } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { radius, theme } from '@/shared/theme';
import {
  ActionLink,
  BarChart,
  Button,
  Card,
  CheckCircle,
  Field,
  InfoCard,
  ListRow,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
  Tag,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { fetchCourses, type Course } from '../api/courses';
import { COURSE, NEW_COURSE_FIELDS } from '../model/course';
import { byDay, isRunning } from '../model/course-view';

export const CourseScreenOptions = { headerShown: false };

/**
 * Один экран на три случая, потому что это один адрес: `all` — список курсов,
 * `new` — форма нового, иначе — сам курс. Разводить их по трём маршрутам
 * значило бы завести три адреса там, где у продукта одно понятие.
 */
export function CourseScreen({ id }: { id: string }) {
  const [editing, setEditing] = useState(false);

  if (id === 'all') return <CourseList />;
  if (id === 'new') return <NewCourse />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={COURSE.title}
          subtitle={COURSE.when}
          action={<ActionLink label="Edit" onPress={() => setEditing(true)} />}
        />

        <Card>
          <Stack gap="md" align="center">
            <CheckCircle checked size={HERO_CHECK} />
            <Text variant="subtitle">{COURSE.taken}</Text>
            <Tag label={COURSE.streak} tone="success" dot />
          </Stack>
        </Card>

        <WidgetCard title="In this stack" caption={String(COURSE.items.length)}>
          <Stack gap="md">
            {COURSE.items.map((item) => (
              <Stack key={item.id} gap="xs">
                <Stack direction="row" justify="space-between" align="center">
                  <Text variant="body">{item.title}</Text>
                  <Text variant="bodySmall" tone="muted">
                    {item.dose}
                  </Text>
                </Stack>
                <Text variant="bodySmall" tone="muted">
                  {item.goal}
                </Text>
                <Stack direction="row" gap="sm" align="center">
                  <View style={styles.dot} />
                  <Text variant="bodySmall" tone="muted">
                    {item.left}
                  </Text>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </WidgetCard>

        <WidgetCard title={COURSE.adherence.title} caption={COURSE.adherence.caption}>
          <BarChart values={COURSE.adherence.days} axis={['30 days ago', 'today']} />
        </WidgetCard>

        <WidgetCard title="Part of a protocol">
          <Stack direction="row" gap="sm" wrap>
            {COURSE.protocols.map((protocol) => (
              <Button
                key={protocol}
                label={protocol}
                variant="tonal"
                size="sm"
                onPress={() => router.push(to.protocol(protocol))}
              />
            ))}
          </Stack>
        </WidgetCard>

        <InfoCard title={COURSE.about.title} text={COURSE.about.text} />
      </Stack>

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title="Edit the course"
        action={<ActionLink label="Done" onPress={() => setEditing(false)} />}>
        <Stack gap="md">
          {NEW_COURSE_FIELDS.map((field) => (
            <Field key={field.id} label={field.label} hint={field.hint} />
          ))}
        </Stack>
      </Sheet>
    </Screen>
  );
}

const HERO_CHECK = 64;
const DOT = 7;

const styles = StyleSheet.create({
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: theme.color.success.solid,
  },
});

/** Список курсов: активные и на паузе, каждый с составом и приверженностью. */
function CourseList() {
  const { date } = useToday();
  const query = useQuery('courses', (signal) => fetchCourses(signal));
  const courses = query.data ?? [];
  const running = courses.filter((course) => isRunning(course, date));

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Supplement courses"
          subtitle={`${running.length} of ${courses.length} running`}
          action={<ActionLink label="Add" onPress={() => router.push(to.course('new'))} />}
        />

        {courses.map((course) => (
          <Card key={course.id}>
            <Stack gap="sm">
              <ListRow
                title={course.name}
                subtitle={coursePeriod(course)}
                trailing={`${course.schedule.length} slots`}
                onPress={() => router.push(to.course(course.id))}
              />
              {/* Переключатель курса здесь был бы обманом: выключать курс
                  сервер умеет только правкой самого курса, не флагом. */}
              <Stack direction="row" gap="xs" wrap>
                {byDay(course).map((day) => (
                  <Tag key={day.day} label={`${day.title} · ${day.slots.length}`} />
                ))}
              </Stack>
            </Stack>
          </Card>
        ))}

        {courses.length === 0 ? (
          <Card variant="sunken">
            <Text tone="muted">{query.loading ? 'Loading the courses…' : 'No courses yet.'}</Text>
          </Card>
        ) : null}
      </Stack>
    </Screen>
  );
}

/** Срок курса словами. Бессрочный курс — тоже курс, и это надо сказать. */
function coursePeriod(course: Course): string {
  if (!course.startDate && !course.endDate) return 'no end date';
  if (course.startDate && course.endDate) {
    return `${shortDay(course.startDate)} — ${shortDay(course.endDate)}`;
  }
  return course.startDate
    ? `from ${shortDay(course.startDate)}`
    : `until ${shortDay(course.endDate ?? '')}`;
}

function NewCourse() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="New course" subtitle="a stack you take together" />

        <Card>
          <Stack gap="md">
            {NEW_COURSE_FIELDS.map((field) => (
              <Field key={field.id} label={field.label} hint={field.hint} />
            ))}
          </Stack>
        </Card>

        <Button label="Create the course" onPress={() => router.back()} />
      </Stack>
    </Screen>
  );
}
