import { Share } from 'react-native';

import { ActionLink, Button, Stack, StatTile, Text, WidgetCard } from '@/shared/ui';

import type { Recording, SavedRecording } from '../api';
import { stamp } from '../model/format';

import { BandEmpty } from './band-empty';

const KB = 1024;
const SHOWN = 3;

/**
 * Голосовые записи: что лежит на браслете и что уже забрано на телефон.
 *
 * Скачанные показываются списком, а не счётчиком. Пока их было видно только
 * числом «на телефоне: 3», выгрузка заканчивалась ничем: файл существовал, а
 * добраться до него из приложения было нельзя — ни посмотреть дату, ни увидеть
 * метки, ни удалить.
 */
export function RecordingsCard({
  onDevice,
  saved,
  freeKb,
  reading,
  live,
  busy,
  onPull,
  onRemove,
}: {
  onDevice: readonly Recording[];
  saved: readonly SavedRecording[];
  freeKb?: number;
  reading: boolean;
  live: boolean;
  busy: boolean;
  onPull: () => void;
  onRemove: (session: number) => void;
}) {
  const free = freeKb === undefined ? null : Math.round((freeKb / KB) * 10) / 10;

  return (
    <WidgetCard variant="sunken" title="Голосовые записи">
      <Stack gap="sm">
        <Stack direction="row" gap="sm">
          <StatTile label="На браслете" value={String(onDevice.length)} />
          <StatTile label="На телефоне" value={String(saved.length)} />
          {free === null ? null : <StatTile label="Свободно" value={String(free)} unit="МБ" />}
        </Stack>

        {onDevice.length === 0 && saved.length === 0 ? (
          <BandEmpty reading={reading} text="Записей пока нет" />
        ) : null}

        {saved.slice(0, SHOWN).map((item) => (
          <Stack key={item.session} direction="row" justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="body">{stamp(item.startedAt)}</Text>
              <Text variant="bodySmall" tone="muted">
                {describe(item)}
              </Text>
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              {/* Без этого выгрузка кончалась ничем: файл лежал на телефоне, а
                  добраться до него из приложения было нельзя. */}
              <ActionLink label="Отправить" onPress={() => void share(item.uri)} />
              <ActionLink label="Удалить" onPress={() => onRemove(item.session)} />
            </Stack>
          </Stack>
        ))}

        <Button
          label={busy ? 'Забираем…' : 'Забрать на телефон'}
          variant="tonal"
          onPress={onPull}
          disabled={!live || busy || onDevice.length === 0}
        />
      </Stack>
    </WidgetCard>
  );
}

/** Длительность, метки и признак отправки — всё, что про запись известно. */
function describe(item: SavedRecording): string {
  const parts = [`${Math.round(item.seconds)} с`];
  if (item.marks.length > 0) parts.push(`меток: ${item.marks.length}`);
  parts.push(item.uploaded ? 'отправлена' : 'не отправлена');
  return parts.join(' · ');
}

/** Отдать файл системе: почта, мессенджер, «сохранить в файлы» — выбирает человек. */
async function share(uri: string): Promise<void> {
  await Share.share({ url: uri }).catch(() => undefined);
}
