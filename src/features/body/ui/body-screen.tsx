import { useState, type ReactNode } from 'react';

import { useBandPaired } from '@/shared/domain';
import { shiftDay, useToday } from '@/shared/lib/day';
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
  const { date: today, timeZone } = useToday();
  // Показанный день общий для всех систем: перелистнул в «Сердце» — и «Сон» на том же дне.
  const [date, setDate] = useState(today);
  // Без привязки секции браслета пусты, а пустой элемент всё равно элемент:
  // раздел принял бы его за содержимое и спрятал вход в подключение.
  const paired = useBandPaired();

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
          today={today}
          timeZone={timeZone}
          onShift={(days) => setDate(shiftDay(date, days))}
          // Карточки устройства — про сейчас: на прошлом дне они врали бы датой.
          device={date === today && paired ? device?.[section.value] : undefined}
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
