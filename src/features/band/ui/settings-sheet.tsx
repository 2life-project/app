import { useEffect } from 'react';

import { Banner, Card, SectionCaption, Sheet, Stack, Text } from '@/shared/ui';

import type { FeatureName } from '../api';
import { visibleGroups, writeOf, type SettingItem } from '../model/settings-view';
import type { DeviceSettingsState } from '../model/use-settings';

import { SettingRow } from './setting-row';

/**
 * Настройки устройства.
 *
 * Читаются каждый раз при открытии: их могли поменять с другого телефона или в
 * программе производителя, и показывать свою прошлую память вместо состояния
 * устройства — значит врать про то, что браслет сейчас делает.
 */
export function DeviceSettingsSheet({
  visible,
  state,
  supported,
  onClose,
}: {
  visible: boolean;
  state: DeviceSettingsState;
  supported: readonly FeatureName[];
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Band settings">
      {visible ? <SettingsBody state={state} supported={supported} /> : null}
    </Sheet>
  );
}

function SettingsBody({
  state,
  supported,
}: {
  state: DeviceSettingsState;
  supported: readonly FeatureName[];
}) {
  const { load, write, settings } = state;

  useEffect(() => {
    void load();
  }, [load]);

  const apply = (item: SettingItem, next: { on?: boolean; amount?: number }) => {
    const { run, optimistic } = writeOf(item, next);
    void write(run, optimistic);
  };

  if (!settings) {
    return (
      <Stack gap="md">
        {state.problem === 'read' ? (
          <Banner
            tone="warning"
            checked={false}
            title="Could not read the settings"
            subtitle="The band has to be connected and in range."
            action={{ label: 'Retry', onPress: () => void load() }}
          />
        ) : (
          <Text tone="muted">
            {state.busy ? 'Reading the band — this takes a moment…' : 'Connect the band first.'}
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {state.problem === 'write' ? (
        <Banner
          tone="danger"
          checked={false}
          title="The band did not take that"
          subtitle="The switch is back where the device actually stands."
        />
      ) : null}

      {visibleGroups(supported).map((group) => (
        <Stack key={group.id} gap="sm">
          <SectionCaption>{group.caption}</SectionCaption>
          <Card>
            <Stack gap="md">
              {group.items.map((item) => (
                <SettingRow
                  key={item.id}
                  item={item}
                  settings={settings}
                  disabled={state.busy}
                  onWrite={apply}
                />
              ))}
            </Stack>
          </Card>
          {group.note ? (
            <Text variant="bodySmall" tone="muted">
              {group.note}
            </Text>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
