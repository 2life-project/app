import type { ReactNode } from 'react';

import { useToday } from '@/shared/lib/day';
import { Card, PagedScreen, Text } from '@/shared/ui';

import { BODY_SECTIONS, BODY_SUBTITLE, type BodySection } from '../model/systems';

import { BodySystem } from './body-system';

/**
 * «Тело» не закрыто браслетом. Данные подсистем приходят с сервера, а туда
 * они попадают из разных источников: стороннего трекера, Apple Health,
 * ручного ввода. Закрывать раздел на локально привязанный браслет значило
 * прятать то, что у человека уже есть.
 *
 * Пустоту показывает сама подсистема — там видно, чего именно не хватает.
 *
 * Карточки браслета приходят слотом по системам: их даёт маршрут, а не эта
 * фича — фича фиче не видна.
 */
export function BodyScreen({ device }: { device?: Partial<Record<BodySection, ReactNode>> } = {}) {
  const { date, timeZone } = useToday();

  return (
    <PagedScreen
      title="Body"
      subtitle={BODY_SUBTITLE}
      sections={BODY_SECTIONS}
      pages={BODY_SECTIONS.map((section) => (
        <BodySystem
          key={section.value}
          section={section.value}
          date={date}
          timeZone={timeZone}
          device={device?.[section.value]}
          fallback={
            <Card variant="sunken">
              <Text tone="muted">Loading this system…</Text>
            </Card>
          }
        />
      ))}
    />
  );
}
