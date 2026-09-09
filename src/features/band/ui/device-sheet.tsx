import { useState } from 'react';

import {
  Banner,
  Button,
  Card,
  ListRow,
  SectionCaption,
  Sheet,
  Stack,
  Tag,
  Text,
} from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { batteryText, clockSkewText, featureLabels, storageText } from '../model/device-view';
import type { Service, ServiceAction } from '../model/use-service';

/**
 * Паспорт устройства и служебные команды.
 *
 * Паспорт стоит рядом со служебным не для красоты: и то и другое отвечает на
 * один вопрос — «почему данные выглядят странно». Расхождение часов объясняет
 * съехавшие даты, маски возможностей — навсегда отсутствующий показатель,
 * заводской сброс — дыру в истории.
 */
export function DeviceSheet({
  visible,
  state,
  service,
  onFind,
  onClose,
}: {
  visible: boolean;
  state: BandState;
  service: Service;
  onFind: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<ServiceAction | null>(null);

  const info = state.info;
  const skew = clockSkewText(state.clockSkew);
  const storage = storageText(state.storage);
  const abilities = featureLabels(state.supported);
  const live = state.stage === 'connected';

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setConfirm(null);
        service.dismiss();
        onClose();
      }}
      title="About this band">
      <Stack gap="lg">
        <Card>
          <Stack gap="xs">
            <ListRow title="Battery" trailing={batteryText(info?.battery)} />
            <ListRow title="Model" trailing={info?.platform ?? '—'} />
            <ListRow title="Firmware" trailing={info?.firmware ?? '—'} />
            <ListRow title="Address" trailing={info?.mac ?? '—'} />
            {storage ? <ListRow title="Recorder memory" subtitle={storage} /> : null}
          </Stack>
        </Card>

        {skew ? (
          <Text variant="bodySmall" tone="muted">
            {skew}
          </Text>
        ) : null}

        {abilities.length > 0 ? (
          <Stack gap="sm">
            <SectionCaption>WHAT THIS ONE CAN DO</SectionCaption>
            <Card variant="sunken">
              <Stack direction="row" gap="xs" wrap>
                {abilities.map((label) => (
                  <Tag key={label} label={label} />
                ))}
              </Stack>
            </Card>
            <Text variant="bodySmall" tone="muted">
              The band reports this itself. Anything not listed will never arrive — that is the
              hardware, not a sync problem.
            </Text>
          </Stack>
        ) : null}

        <Stack gap="sm">
          <SectionCaption>SERVICE</SectionCaption>

          {service.done ? <Banner tone="success" title={DONE_TEXT[service.done]} /> : null}
          {service.problem ? (
            <Banner
              tone="danger"
              checked={false}
              title="The band did not do that"
              subtitle="Nothing changed on the device. Try again while it is in range."
            />
          ) : null}

          <Card>
            <Stack gap="xs">
              <ListRow
                title="Find my band"
                subtitle="Buzzes for a few seconds"
                onPress={live ? onFind : undefined}
              />
              <ListRow
                title="Pair again"
                subtitle="Re-runs pairing without forgetting the band"
                onPress={live ? () => setConfirm('repair') : undefined}
              />
              <ListRow
                title="Erase all recordings"
                titleTone="danger"
                subtitle="Frees the recorder memory. Anything not downloaded is gone."
                onPress={live ? () => setConfirm('erase') : undefined}
              />
              <ListRow
                title="Factory reset"
                titleTone="danger"
                subtitle="Wipes settings, alarms and the history still on the device."
                onPress={live ? () => setConfirm('reset') : undefined}
              />
            </Stack>
          </Card>

          {live ? null : (
            <Text variant="bodySmall" tone="muted">
              Service commands need a live connection.
            </Text>
          )}
        </Stack>

        {confirm ? (
          <Card variant="sunken">
            <Stack gap="md">
              <Text variant="subtitle">{CONFIRM[confirm].title}</Text>
              <Text tone="muted">{CONFIRM[confirm].text}</Text>
              <Button
                label={CONFIRM[confirm].action}
                tone="danger"
                loading={service.busy}
                onPress={() => {
                  void service.run(confirm);
                  setConfirm(null);
                }}
              />
              <Button label="Cancel" variant="plain" onPress={() => setConfirm(null)} />
            </Stack>
          </Card>
        ) : null}
      </Stack>
    </Sheet>
  );
}

/**
 * Подтверждение словами того, что именно исчезнет. «Вы уверены?» не отвечает на
 * единственный вопрос, который здесь важен: что пропадёт и откуда.
 */
const CONFIRM: Record<ServiceAction, { title: string; text: string; action: string }> = {
  erase: {
    title: 'Erase every recording on the band?',
    text: 'Recordings already downloaded to the phone stay. Anything still only on the band is gone for good — the device asks nothing on its side.',
    action: 'Erase recordings',
  },
  reset: {
    title: 'Reset the band to factory state?',
    text: 'Settings, alarms and the days of history still stored on the device are wiped. What the phone has already read stays here.',
    action: 'Reset the band',
  },
  repair: {
    title: 'Run pairing again?',
    text: 'The band re-runs pairing with this phone. Your data is untouched.',
    action: 'Pair again',
  },
};

const DONE_TEXT: Record<ServiceAction, string> = {
  erase: 'Recordings erased from the band',
  reset: 'The band is back to factory state',
  repair: 'Pairing has been re-run',
};
