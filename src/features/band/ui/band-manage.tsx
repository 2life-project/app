import { useState } from 'react';

import { Card, IconTile, ListRow, SectionCaption, Stack } from '@/shared/ui';

import type { FeatureName } from '../api';
import type { Alarms } from '../model/use-alarms';
import type { DeviceSettingsState } from '../model/use-settings';

import { AlarmsSheet } from './alarms-sheet';
import { DeviceSettingsSheet } from './settings-sheet';

/**
 * Управление устройством: то, что человек задаёт браслету, а не читает с него.
 *
 * Собрано в один список намеренно. Раскладывать будильники, настройки и
 * служебные команды карточками по всему экрану значит поставить «стереть всё»
 * в один ряд с «показать пульс» — и однажды кто-то промахнётся.
 */
export function BandManage({
  alarms,
  settings,
  supported,
  live,
}: {
  alarms: Alarms;
  settings: DeviceSettingsState;
  supported: readonly FeatureName[];
  live: boolean;
}) {
  const [open, setOpen] = useState<'alarms' | 'settings' | null>(null);

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
        </Stack>
      </Card>

      <AlarmsSheet visible={open === 'alarms'} alarms={alarms} onClose={() => setOpen(null)} />
      <DeviceSettingsSheet
        visible={open === 'settings'}
        state={settings}
        supported={supported}
        onClose={() => setOpen(null)}
      />
    </Stack>
  );
}

const ICON = 32;
