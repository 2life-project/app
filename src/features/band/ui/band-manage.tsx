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
  onEditProfile,
}: {
  state: BandState;
  alarms: Alarms;
  settings: DeviceSettingsState;
  service: Service;
  onFind: () => void;
  onEditProfile: () => void;
}) {
  const [open, setOpen] = useState<'alarms' | 'settings' | 'device' | null>(null);
  const live = state.stage === 'connected';
  // Пока браслета нет, будильники и настройки читать не с чего: строки в
  // списке выглядели бы живыми и молча не отвечали на нажатие.
  const paired = state.device !== undefined || state.info !== undefined;

  return (
    <Stack gap="sm">
      <SectionCaption>MANAGE</SectionCaption>
      <Card>
        <Stack gap="xs">
          {/* Профиль тела — такая же настройка устройства, как будильник: его
              задают один раз и потом не трогают. На экране показателей ему
              места нет, а здесь он на своём. */}
          <ListRow
            leading={<IconTile name="user" size={ICON} />}
            title="Body profile"
            subtitle="Height, weight, age — the band counts distance by them"
            onPress={onEditProfile}
          />
          {paired ? (
            <>
              <ListRow
                leading={<IconTile name="bell" size={ICON} />}
                title="Alarms"
                subtitle={
                  live
                    ? 'Kept on the band, ring without the phone'
                    : 'Needs a live connection to change'
                }
                onPress={live ? () => setOpen('alarms') : undefined}
              />
              <ListRow
                leading={<IconTile name="sliders" size={ICON} />}
                title="Band settings"
                subtitle={
                  live
                    ? 'What it measures on its own, and what it buzzes about'
                    : 'Needs a live connection to change'
                }
                onPress={live ? () => setOpen('settings') : undefined}
              />
            </>
          ) : null}
          {paired ? (
            <ListRow
              leading={<IconTile name="info" size={ICON} />}
              title="About this band"
              subtitle="Battery, firmware, memory and service commands"
              onPress={() => setOpen('device')}
            />
          ) : null}
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
