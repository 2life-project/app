import { useEffect, useRef, useState } from 'react';

import { ListRow, Segmented, Slider, Stack, Text, Toggle } from '@/shared/ui';

import type { DeviceSettings } from '../api/settings';
import { thresholdValue, type SettingItem } from '../model/settings-view';

/**
 * Одна настройка устройства.
 *
 * Вид выбирается по типу настройки, а не по её имени: список настроек лежит в
 * модели, и добавление новой не должно требовать правки этого файла.
 */
export function SettingRow({
  item,
  settings,
  disabled,
  onWrite,
}: {
  item: SettingItem;
  settings: DeviceSettings;
  disabled: boolean;
  onWrite: (item: SettingItem, next: { on?: boolean; amount?: number }) => void;
}) {
  if (item.kind === 'toggle') {
    const on = item.read(settings) ?? false;

    return (
      <ListRow
        title={item.title}
        subtitle={item.note}
        trailingSlot={
          <Toggle
            value={on}
            accessibilityLabel={item.title}
            onValueChange={disabled ? undefined : (next) => onWrite(item, { on: next })}
          />
        }
      />
    );
  }

  if (item.kind === 'interval') {
    const current = item.read(settings);

    return (
      <Stack gap="xs">
        <ListRow
          title={item.title}
          subtitle={item.note}
          trailing={current === undefined ? '—' : `${current} min`}
        />
        <Segmented
          items={item.options.map((minutes) => ({ value: String(minutes), label: `${minutes}m` }))}
          value={String(current ?? '')}
          onChange={(value) => onWrite(item, { amount: Number(value) })}
        />
      </Stack>
    );
  }

  return <ThresholdRow item={item} settings={settings} disabled={disabled} onWrite={onWrite} />;
}

/**
 * Порог с тревогой.
 *
 * Ползунок ведёт своё значение сам, а на устройство оно уезжает, когда палец
 * остановился. Иначе каждое движение — отдельная команда по радио: очередь
 * забивается, а до браслета доезжает не то значение, на котором человек
 * остановился, а всё подряд по дороге к нему.
 */
function ThresholdRow({
  item,
  settings,
  disabled,
  onWrite,
}: {
  item: Extract<SettingItem, { kind: 'threshold' }>;
  settings: DeviceSettings;
  disabled: boolean;
  onWrite: (item: SettingItem, next: { on?: boolean; amount?: number }) => void;
}) {
  const stored = thresholdValue(item.read(settings));
  const on = stored?.enabled ?? false;
  const [dragged, setDragged] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const amount = dragged ?? stored?.amount ?? item.range.min;

  const slide = (next: number) => {
    setDragged(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onWrite(item, { on: true, amount: next }), WRITE_DELAY_MS);
  };

  return (
    <Stack gap="sm">
      <ListRow
        title={item.title}
        subtitle={item.note}
        trailingSlot={
          <Toggle
            value={on}
            accessibilityLabel={item.title}
            onValueChange={disabled ? undefined : (next) => onWrite(item, { on: next, amount })}
          />
        }
      />
      {/* Шкала появляется только у включённого порога: выключенный порог с
          ползунком читается как «работает, но на этом значении». */}
      {on ? (
        <Stack gap="xs">
          <Slider
            value={amount}
            minimum={item.range.min}
            maximum={item.range.max}
            accessibilityLabel={`${item.title}, ${item.unit}`}
            onChange={slide}
          />
          <Text variant="bodySmall" tone="muted">
            {amount} {item.unit}
          </Text>
        </Stack>
      ) : null}
    </Stack>
  );
}

/** Сколько ждать после последнего движения ползунка, прежде чем писать в устройство. */
const WRITE_DELAY_MS = 600;
