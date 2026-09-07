import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Card,
  InfoCard,
  LinkCard,
  ListRow,
  PagedScreen,
  Stack,
  StatTile,
  Tag,
  Text,
  WidgetCard,
} from '@/shared/ui';

import {
  ALLERGIES,
  DOCUMENTS,
  GENETICS,
  OUT_OF_RANGE,
  RECORDS_SECTIONS,
  VACCINES,
  WHY_RECORDS,
} from '../model/records';

function DocumentIcon() {
  return (
    <View style={styles.icon}>
      <Feather name="file-text" size={size.icon.md} color={theme.color.textMuted} />
    </View>
  );
}

function Labs() {
  return (
    <Stack gap="md">
      <WidgetCard title="Out of range">
        <Stack gap="sm">
          <View style={styles.badge}>
            <Tag label="4 OF 64" tone="danger" dot />
          </View>
          <View style={styles.tiles}>
            {OUT_OF_RANGE.slice(0, 2).map((marker) => (
              <StatTile key={marker.label} {...marker} />
            ))}
          </View>
          <View style={styles.tiles}>
            {OUT_OF_RANGE.slice(2).map((marker) => (
              <StatTile key={marker.label} {...marker} />
            ))}
          </View>
          <ActionLink label="All 64 markers" chevron onPress={() => router.push(to.lab('all'))} />
        </Stack>
      </WidgetCard>

      <Documents />
      <Allergies />

      <InfoCard
        title="Why this lives here"
        text={WHY_RECORDS}
        link={{ label: 'Learn more', onPress: () => router.push(to.lab('about')) }}
      />

      <LinkCard label="All records" onPress={() => router.push(to.lab('all'))} />
    </Stack>
  );
}

function Documents() {
  return (
    <WidgetCard title="Documents" action={{ label: String(DOCUMENTS.length), onPress: () => {} }}>
      <Stack gap="sm">
        {DOCUMENTS.map((document) => (
          <ListRow
            key={document.id}
            leading={<DocumentIcon />}
            title={document.title}
            subtitle={document.subtitle}
            onPress={() => router.push(to.lab(document.id))}
          />
        ))}
        <Text variant="bodySmall" tone="muted">
          Upload new documents in the web app
        </Text>
      </Stack>
    </WidgetCard>
  );
}

function Allergies() {
  return (
    <Card>
      <Stack gap="md">
        <Text variant="subtitle">Allergies</Text>
        {ALLERGIES.map((allergy) => (
          <Stack key={allergy.id} direction="row" justify="space-between" align="center">
            <Text variant="body">{allergy.title}</Text>
            <Tag label={allergy.severity} tone={allergy.tone} dot />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

function SimpleList({
  title,
  items,
}: {
  title: string;
  items: readonly { id: string; title: string; subtitle: string }[];
}) {
  return (
    <Stack gap="md">
      <WidgetCard title={title}>
        <Stack gap="sm">
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(to.lab(item.id))}
            />
          ))}
        </Stack>
      </WidgetCard>
    </Stack>
  );
}

export function RecordsScreen() {
  return (
    <PagedScreen
      title="Records"
      subtitle="12 documents · last upload Jul 2"
      sections={RECORDS_SECTIONS}
      pages={[
        <Labs key="labs" />,
        <Stack key="documents" gap="md">
          <Documents />
        </Stack>,
        <Stack key="allergies" gap="md">
          <Allergies />
        </Stack>,
        <SimpleList key="genetics" title="Genetics" items={GENETICS} />,
        <SimpleList key="vaccines" title="Vaccines" items={VACCINES} />,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'flex-end' },
  tiles: { flexDirection: 'row', gap: space.sm },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: theme.color.neutral.surface,
  },
});
