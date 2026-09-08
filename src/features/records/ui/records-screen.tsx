import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@/core/http/use-query';
import { dayOf, shortDay } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import {
  ActionLink,
  Card,
  EmptyPanel,
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

import type { Biochemistry, DocumentRow } from '../api/contract';
import { fetchBiochemistry, fetchDocuments } from '../api/records';
import {
  deltaNote,
  freshnessNote,
  markerRange,
  outOfRangeTone,
  markerValue,
  outOfRange,
} from '../model/biochemistry';
import { NOT_ON_SERVER, RECORDS_SECTIONS, WHY_RECORDS } from '../model/records';

const OUT_OF_RANGE_SHOWN = 4;

export function RecordsScreen() {
  const bio = useQuery('biochemistry', (signal) => fetchBiochemistry(signal));
  const docs = useQuery('documents', (signal) => fetchDocuments(signal));

  const markers = bio.data ? Object.keys(bio.data.markersByKey).length : 0;
  const documents = docs.data?.documents ?? [];

  return (
    <PagedScreen
      title="Records"
      subtitle={subtitle(markers, documents)}
      sections={RECORDS_SECTIONS}
      pages={[
        <Labs key="labs" data={bio.data} loading={bio.loading} documents={documents} />,
        <Stack key="documents" gap="md">
          <Documents documents={documents} loading={docs.loading} />
        </Stack>,
        // Аллергии и прививки на сервере не ведутся. Показывать вместо них
        // придуманный список в медицинской карте нельзя: по такому списку
        // принимают решения, а он был бы неправдой.
        <Missing key="allergies" what={NOT_ON_SERVER.allergies} />,
        <Missing key="genetics" what={NOT_ON_SERVER.genetics} />,
        <Missing key="vaccines" what={NOT_ON_SERVER.vaccines} />,
      ]}
    />
  );
}

function subtitle(markers: number, documents: readonly DocumentRow[]): string {
  if (markers === 0 && documents.length === 0) return 'loading…';
  const last = [...documents].sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  const when = last ? ` · last upload ${shortDay(dayOf(last.uploadedAt))}` : '';
  return `${documents.length} documents · ${markers} markers${when}`;
}

function Labs({
  data,
  loading,
  documents,
}: {
  data: Biochemistry | null;
  loading: boolean;
  documents: readonly DocumentRow[];
}) {
  if (!data) {
    return (
      <Card variant="sunken">
        <Text tone="muted">{loading ? 'Loading the markers…' : 'The markers did not load.'}</Text>
      </Card>
    );
  }

  const flagged = outOfRange(data, OUT_OF_RANGE_SHOWN);
  const total = Object.keys(data.markersByKey).length;

  return (
    <Stack gap="md">
      <WidgetCard title="Out of range">
        <Stack gap="sm">
          {flagged.length === 0 ? (
            <Text tone="muted">Everything the lab measured sits inside its reference.</Text>
          ) : (
            <>
              <View style={styles.badge}>
                <Tag label={`${flagged.length} OF ${total}`} tone="danger" dot />
              </View>
              {[flagged.slice(0, 2), flagged.slice(2)].map((row, index) =>
                row.length === 0 ? null : (
                  <View key={index} style={styles.tiles}>
                    {row.map((marker) => (
                      <StatTile
                        key={marker.markerKey}
                        label={(marker.displayNameEn ?? marker.displayName).toUpperCase()}
                        value={markerValue(marker)}
                        unit={marker.latestUnit ?? undefined}
                        note={markerRange(marker) ?? undefined}
                        noteTone={outOfRangeTone(marker)}
                      />
                    ))}
                  </View>
                ),
              )}
            </>
          )}
          <ActionLink
            label={`All ${total} markers`}
            chevron
            onPress={() => router.push(to.lab('all'))}
          />
        </Stack>
      </WidgetCard>

      {/* Устаревшее и изменившееся сервер считает сам, по своим порогам —
          и говорит, по каким именно. */}
      <Card>
        <Stack gap="sm">
          <Text variant="subtitle">Worth a repeat</Text>
          <Text variant="bodySmall" tone="muted">
            {`${data.staleKeys.length} markers older than ${data.thresholds.staleDays} days · ${data.changedKeys.length} moved more than ${data.thresholds.changedPercent}%`}
          </Text>
          {data.staleKeys.slice(0, 3).map((key) => {
            const marker = data.markersByKey[key];
            return marker ? (
              <ListRow
                key={key}
                title={marker.displayName}
                subtitle={freshnessNote(marker) ?? undefined}
                trailing={markerValue(marker)}
                trailingCaption={deltaNote(marker.delta) ?? undefined}
                onPress={() => router.push(to.lab(key))}
              />
            ) : null;
          })}
        </Stack>
      </Card>

      <Documents documents={documents} loading={false} />

      <InfoCard title="Why this lives here" text={WHY_RECORDS} />

      <LinkCard label="All records" onPress={() => router.push(to.lab('all'))} />
    </Stack>
  );
}

function Documents({
  documents,
  loading,
}: {
  documents: readonly DocumentRow[];
  loading: boolean;
}) {
  return (
    <WidgetCard title="Documents" caption={String(documents.length)}>
      <Stack gap="sm">
        {documents.slice(0, 6).map((document) => (
          <ListRow
            key={document.id}
            leading={<DocumentIcon />}
            title={document.originalFilename}
            subtitle={`${shortDay(dayOf(document.uploadedAt))} · ${document.parseStatus}`}
            onPress={() => router.push(to.lab(document.id))}
          />
        ))}
        {documents.length === 0 ? (
          <Text tone="muted">{loading ? 'Loading documents…' : 'No documents yet.'}</Text>
        ) : null}
        <Text variant="bodySmall" tone="muted">
          Upload new documents in the web app
        </Text>
      </Stack>
    </WidgetCard>
  );
}

function Missing({ what }: { what: { title: string; text: string } }) {
  return (
    <Stack gap="md">
      <EmptyPanel icon="inbox" title={what.title} text={what.text} />
    </Stack>
  );
}

function DocumentIcon() {
  return (
    <View style={styles.icon}>
      <Feather name="file-text" size={size.icon.md} color={theme.color.textMuted} />
    </View>
  );
}

const ICON = 36;

const styles = StyleSheet.create({
  badge: { alignItems: 'flex-end' },
  tiles: { flexDirection: 'row', gap: space.sm },
  icon: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: theme.color.neutral.surface,
  },
});
