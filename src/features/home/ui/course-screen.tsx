import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePersistentState } from '@/shared/lib/store';
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
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionCaption,
  Sheet,
  Stack,
  Tag,
  Text,
  Toggle,
  WidgetCard,
} from '@/shared/ui';

import { COURSE, COURSE_GROUPS, COURSES_SUMMARY, NEW_COURSE_FIELDS } from '../model/course';

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
  const [active, setActive] = usePersistentState<Record<string, boolean>>('courses', {});

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Supplement courses"
          subtitle={COURSES_SUMMARY}
          action={<ActionLink label="Add" onPress={() => router.push(to.course('new'))} />}
        />

        {COURSE_GROUPS.map((group) => (
          <Stack key={group.id} gap="sm">
            <SectionCaption>{`${group.label} · ${group.courses.length}`}</SectionCaption>
            {group.courses.map((course) => (
              <Card key={course.id}>
                <Stack gap="sm">
                  <ListRow
                    title={course.title}
                    subtitle={course.when}
                    trailingSlot={
                      <Toggle
                        value={active[course.id] ?? course.on}
                        accessibilityLabel={course.title}
                        onValueChange={(value) => setActive({ ...active, [course.id]: value })}
                      />
                    }
                  />
                  <Stack direction="row" gap="xs" wrap>
                    {course.items.map((item) => (
                      <Tag key={item} label={item} tone="neutral" />
                    ))}
                  </Stack>
                  {course.adherence ? <ProgressBar value={course.adherence.value} /> : null}
                  <Stack direction="row" justify="space-between" align="center">
                    <Stack direction="row" gap="sm" align="center">
                      <Tag
                        label={course.adherence ? course.adherence.label : 'PAUSED'}
                        tone={course.adherence ? 'success' : 'neutral'}
                        dot
                      />
                      <Text variant="bodySmall" tone="muted">
                        {course.supply}
                      </Text>
                    </Stack>
                    <ActionLink
                      label="Set up"
                      chevron
                      onPress={() => router.push(to.course(course.id))}
                    />
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        ))}

        <Button
          label="+ Add a course"
          variant="dashed"
          onPress={() => router.push(to.course('new'))}
        />
      </Stack>
    </Screen>
  );
}

/** Новый курс: поля из макета. Ввод пока никуда не уходит — контракта нет. */
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
