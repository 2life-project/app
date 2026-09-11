import { StyleSheet, View } from 'react-native';

import { radius, theme } from '@/shared/theme';
import { Card, IconTile, ListRow, SectionCaption, Stack } from '@/shared/ui';

import { type SettingsRow } from '../model/settings';

const ICON_TILE = 32;
const DOT = 7;

/** Группа строк настроек под своей подписью. */
export function Section({
  caption,
  rows,
  onOpen,
}: {
  caption: string;
  rows: readonly SettingsRow[];
  onOpen: (row: SettingsRow) => void;
}) {
  return (
    <Stack gap="sm">
      <SectionCaption>{caption}</SectionCaption>
      <Card>
        <Stack gap="xs">
          {rows.map((row) => (
            <ListRow
              key={row.id}
              leading={<IconTile name={row.icon} tone={row.tone} size={ICON_TILE} />}
              title={row.title}
              titleTone={row.titleTone}
              subtitle={row.subtitle}
              trailing={row.value}
              trailingSlot={row.connected ? <View style={styles.dot} /> : undefined}
              onPress={row.opens ? () => onOpen(row) : undefined}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  // Точка связи — состояние источника, а не его тип: цвет здесь значит «на связи».
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: theme.color.success.solid,
  },
});
