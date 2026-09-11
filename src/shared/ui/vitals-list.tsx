import { Card } from './card';
import { ListRow } from './list-row';
import { SectionCaption } from './section-summary';
import { Stack } from './stack';

export type VitalsListProps = {
  /** Откуда числа: подпись над списком, например «FROM YOUR BAND · 12:17». */
  caption: string;
  vitals: readonly { id: string; title: string; note?: string; value: string }[];
};

/** Показания с руки строками: одна форма для Главной, «Тела» и журнала. */
export function VitalsList({ caption, vitals }: VitalsListProps) {
  return (
    <Stack gap="sm">
      <SectionCaption>{caption}</SectionCaption>
      <Card>
        <Stack gap="xs">
          {vitals.map((vital) => (
            <ListRow
              key={vital.id}
              title={vital.title}
              subtitle={vital.note}
              trailing={vital.value}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
