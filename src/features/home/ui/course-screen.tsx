import { router } from 'expo-router';
import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import { logger } from '@/core/log/logger';
import { useToday } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import {
  ActionLink,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
  Tag,
  Text,
  Toggle,
  WidgetCard,
} from '@/shared/ui';

import { createCourse, fetchCourse, fetchCourses, updateCourse, type Course } from '../api/courses';
import { coursePeriod, fieldsOf } from '../model/course';
import { byDay, isRunning, slotTitle } from '../model/course-view';

import { CourseForm } from './course-form';

export const CourseScreenOptions = { headerShown: false };

/**
 * Один экран на три случая, потому что это один адрес: `all` — список курсов,
 * `new` — форма нового, иначе — сам курс. Разводить их по трём маршрутам
 * значило бы завести три адреса там, где у продукта одно понятие.
 */
export function CourseScreen({ id }: { id: string }) {
  if (id === 'all') return <CourseList />;
  if (id === 'new') return <NewCourse />;
  return <CourseDetail id={id} />;
}

/** Один курс: срок, расписание по дням, тумблер и правка имени со сроком. */
function CourseDetail({ id }: { id: string }) {
  const query = useQuery(`course:${id}`, (signal) => fetchCourse(id, signal));
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  /**
   * Курс после своей записи. Сервер отвечает на правку без расписания, а
   * перечитывание идёт своим темпом: до него экран показывает то, что
   * человек только что сохранил, поверх прочитанного ранее.
   */
  const [saved, setSaved] = useState<Omit<Course, 'schedule'> | null>(null);

  const course = query.data ? { ...query.data, ...saved } : null;

  const toggle = (on: boolean) => {
    setFailed(false);
    updateCourse(id, { isActive: on })
      .then(setSaved)
      .catch((failure: unknown) => {
        // Отскочивший тумблер без слов выглядит как «не работает».
        logger.warn('Курс не переключился', { id, on, failure });
        setFailed(true);
      });
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={course?.name ?? 'Course'}
          subtitle={course ? coursePeriod(course) : query.loading ? 'loading…' : 'did not load'}
          action={course ? <ActionLink label="Edit" onPress={() => setEditing(true)} /> : null}
        />

        {failed ? (
          <Card variant="sunken">
            <Text tone="danger">The change did not save. Try again.</Text>
          </Card>
        ) : null}

        {course ? (
          <Card>
            <ListRow
              title={course.isActive ? 'Running' : 'Paused'}
              subtitle="a paused course keeps its schedule"
              trailingSlot={
                <Toggle
                  value={course.isActive}
                  accessibilityLabel="Course"
                  onValueChange={toggle}
                />
              }
            />
          </Card>
        ) : null}

        {course ? (
          <WidgetCard title="Schedule" caption={`${course.schedule.length} slots`}>
            <Stack gap="md">
              {byDay(course).map((day) => (
                <Stack key={day.day} gap="xs">
                  <Text variant="subtitle">{day.title}</Text>
                  {day.slots.map((slot) => (
                    <ListRow
                      key={slot.id}
                      title={slotTitle(slot)}
                      subtitle={slot.timeHint ?? undefined}
                      trailing={slot.timeLabel}
                    />
                  ))}
                </Stack>
              ))}
              {course.schedule.length === 0 ? (
                <Text tone="muted">No slots yet — the schedule is edited in the web app.</Text>
              ) : null}
            </Stack>
          </WidgetCard>
        ) : null}
      </Stack>

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title="Edit the course"
        action={<ActionLink label="Cancel" onPress={() => setEditing(false)} />}>
        {course ? (
          <CourseForm
            initial={fieldsOf(course)}
            action="Save"
            onSave={async (draft) => {
              setSaved(await updateCourse(id, draft));
              setEditing(false);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** Список курсов: идущие и на паузе, каждый с расписанием по дням. */
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
                trailing={course.isActive ? `${course.schedule.length} slots` : 'paused'}
                onPress={() => router.push(to.course(course.id))}
              />
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

/** Новый курс: имя и срок. Расписание добавляется уже в созданный. */
function NewCourse() {
  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="New course" subtitle="a stack you take together" />
        <Card>
          <CourseForm
            initial={{ name: '', start: '', end: '' }}
            action="Create the course"
            onSave={async (draft) => {
              const created = await createCourse(draft);
              // Не назад, а в созданный курс: расписание живёт уже в нём.
              router.replace(to.course(created.id));
            }}
          />
        </Card>
      </Stack>
    </Screen>
  );
}
