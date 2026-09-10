import { useEffect, useState } from 'react';

import {
  ActionLink,
  Banner,
  Button,
  EmptyPanel,
  ListRow,
  Sheet,
  Stack,
  Text,
  Toggle,
} from '@/shared/ui';

import type { Alarm } from '../api';
import { daysText, realAlarms, timeText } from '../model/alarm-view';
import type { Alarms } from '../model/use-alarms';

import { AlarmEditor } from './alarm-editor';

/**
 * Будильники браслета.
 *
 * Список и правка живут в одной панели, а не в двух вложенных: шит поверх шита
 * на телефоне закрывается не тем жестом, которым человек целился.
 */
export function AlarmsSheet({
  visible,
  alarms,
  onClose,
}: {
  visible: boolean;
  alarms: Alarms;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Alarms">
      {/* Содержимое монтируется вместе с панелью: чтение с устройства
          начинается при открытии, а не при отрисовке закрытой панели — это
          двадцать обменов по радио, которые иначе шли бы впустую. */}
      {visible ? <AlarmsBody alarms={alarms} /> : null}
    </Sheet>
  );
}

function AlarmsBody({ alarms }: { alarms: Alarms }) {
  const [editing, setEditing] = useState<Alarm | 'new' | null>(null);
  const { load } = alarms;

  useEffect(() => {
    void load();
  }, [load]);

  if (editing !== null) {
    const alarm = editing === 'new' ? undefined : editing;
    const done = (ok: boolean) => {
      if (ok) setEditing(null);
    };

    return (
      <Stack gap="md">
        <ActionLink label="← All alarms" onPress={() => setEditing(null)} />
        <AlarmEditor
          alarm={alarm}
          busy={alarms.busy}
          onSave={(draft) => void alarms.save(draft).then(done)}
          onRemove={alarm ? () => void alarms.remove(alarm.slot).then(done) : undefined}
        />
      </Stack>
    );
  }

  const list = alarms.list === null ? null : realAlarms(alarms.list);
  const full = alarms.limit !== undefined && (alarms.list?.length ?? 0) >= alarms.limit;

  return (
    <Stack gap="md">
      {alarms.problem === 'read' ? (
        <Banner
          tone="warning"
          checked={false}
          title="Could not read the alarms"
          subtitle="The band answered nothing. It has to be connected to change them."
          action={{ label: 'Retry', onPress: () => void load() }}
        />
      ) : null}

      {alarms.problem === 'write' || alarms.problem === 'full' ? (
        <Banner
          tone="danger"
          checked={false}
          title={alarms.problem === 'full' ? 'No free slot left' : 'The alarm did not save'}
          subtitle={
            alarms.problem === 'full'
              ? 'Delete one of the existing alarms to add another.'
              : 'Nothing changed on the band. Try again while it is in range.'
          }
        />
      ) : null}

      {list === null ? (
        <Text tone="muted">
          {alarms.busy ? 'Reading the band…' : 'Connect the band to see its alarms.'}
        </Text>
      ) : list.length === 0 ? (
        <EmptyPanel
          icon="bell"
          title="No alarms yet"
          text="The band has no screen — an alarm reaches you as vibration on the wrist."
        />
      ) : (
        list.map((alarm) => (
          <ListRow
            key={alarm.slot}
            title={timeText(alarm.hour, alarm.minute)}
            subtitle={
              alarm.label ? `${daysText(alarm.days)} · ${alarm.label}` : daysText(alarm.days)
            }
            onPress={() => setEditing(alarm)}
            trailingSlot={
              <Toggle
                value={alarm.enabled}
                accessibilityLabel={`Alarm at ${timeText(alarm.hour, alarm.minute)}`}
                onValueChange={(on) => void alarms.toggle(alarm.slot, on)}
              />
            }
          />
        ))
      )}

      <Button
        label={full ? `All ${alarms.limit ?? 0} slots are used` : 'Add an alarm'}
        variant="tonal"
        disabled={full || alarms.list === null || alarms.busy}
        onPress={() => setEditing('new')}
      />

      {alarms.limit === undefined ? null : (
        <Text variant="bodySmall" tone="muted">
          The band holds {alarms.limit} alarms. They live on the device and ring without the phone.
        </Text>
      )}
    </Stack>
  );
}
