import { useState } from 'react';

import { Card, IconTile, ListRow, SectionCaption, Stack } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import type { Alarms } from '../model/use-alarms';
import type { Service } from '../model/use-service';
import type { DeviceSettingsState } from '../model/use-settings';

import { AlarmsSheet } from './alarms-sheet';
import { DeviceSheet } from './device-sheet';
import { DeviceSettingsSheet } from './settings-sheet';

/**
 * Управление устройством: то, что человек задаёт браслету, а не читает с него.
 *
 * Собрано в один список намеренно. Раскладывать будильники, настройки и
 * служебные команды карточками по всему экрану значит поставить «стереть всё»
 * в один ряд с «показать пульс» — и однажды кто-то промахнётся.
 */
export function BandManage({
  state,
  alarms,
  settings,
  service,
  onFind,
}: {
  state: BandState;
  alarms: Alarms;
  settings: DeviceSettingsState;
  service: Service;
  onFind: () => void;
}) {
  const [open, setOpen] = useState<'alarms' | 'settings' | 'device' | null>(null);
  const live = state.stage === 'connected';

  return (
    <Stack gap="sm">
      <SectionCaption>MANAGE</SectionCaption>
      <Card>
        <Stack gap="xs">
          <ListRow
            leading={<IconTile name="bell" size={ICON} />}
            title="Alarms"
            subtitle={
              live ? 'Kept on the band, ring without the phone' : 'Connect the band to change them'
            }
            onPress={live ? () => setOpen('alarms') : undefined}
          />
          <ListRow
            leading={<IconTile name="sliders" size={ICON} />}
            title="Band settings"
            subtitle={
              live
                ? 'What it measures on its own, and what it buzzes about'
                : 'Connect the band to change them'
            }
            onPress={live ? () => setOpen('settings') : undefined}
          />
          <ListRow
            leading={<IconTile name="info" size={ICON} />}
            title="About this band"
            subtitle="Battery, firmware, memory and service commands"
            onPress={() => setOpen('device')}
          />
        </Stack>
      </Card>

      <AlarmsSheet visible={open === 'alarms'} alarms={alarms} onClose={() => setOpen(null)} />
      <DeviceSettingsSheet
        visible={open === 'settings'}
        state={settings}
        supported={state.supported}
        onClose={() => setOpen(null)}
      />
      <DeviceSheet
        visible={open === 'device'}
        state={state}
        service={service}
        onFind={onFind}
        onClose={() => setOpen(null)}
      />
    </Stack>
  );
}

const ICON = 32;
