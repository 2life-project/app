import { useState } from 'react';

import {
  ageOf,
  isComplete,
  runStepOf,
  setBodyProfile,
  useBodyProfile,
  walkStepOf,
  type BodyProfile,
} from '@/shared/domain';
import { ActionLink, Banner, Card, ListRow, SectionCaption, Stack, Text } from '@/shared/ui';

import { BodyProfileSheet } from './body-profile-sheet';

/**
 * Профиль тела на экране браслета.
 *
 * Стоит здесь, а не в настройках приложения, потому что это состояние
 * устройства: пока профиль пуст, всё, что браслет посчитал, посчитано про
 * кого-то другого. Незаполненный профиль показывается плашкой, а не строкой с
 * прочерками — прочерк читается как «данных пока нет», а не как «поправьте».
 */
export function BodyProfileCard({ onSaved }: { onSaved: (profile: BodyProfile) => void }) {
  const profile = useBodyProfile();
  const [editing, setEditing] = useState(false);

  const save = (patch: Partial<BodyProfile>) => onSaved(setBodyProfile(patch));
  const sheet = (
    <BodyProfileSheet
      visible={editing}
      profile={profile}
      onClose={() => setEditing(false)}
      onSave={save}
    />
  );

  if (!isComplete(profile)) {
    return (
      <>
        <Banner
          tone="warning"
          checked={false}
          title="The band does not know your body"
          subtitle="It counts distance and calories from factory height and weight until you fill this in."
          action={{ label: 'Fill in', onPress: () => setEditing(true) }}
        />
        {sheet}
      </>
    );
  }

  const age = ageOf(profile.birthDate);
  const height = profile.heightCm ?? 0;

  return (
    <Stack gap="sm">
      <SectionCaption>BODY PROFILE</SectionCaption>
      <Card>
        <Stack gap="xs">
          <ListRow title="Height" trailing={`${profile.heightCm} cm`} />
          <ListRow title="Weight" trailing={`${profile.weightKg} kg`} />
          <ListRow
            title="Age"
            subtitle={profile.birthDate ?? undefined}
            trailing={age === null ? '—' : `${age}`}
          />
          <ListRow title="Sex" trailing={profile.sex === 'male' ? 'Male' : 'Female'} />
          <ListRow
            title="Worn on"
            trailing={profile.wearHand === 'right' ? 'Right wrist' : 'Left wrist'}
          />
          <ListRow
            title="Step length"
            subtitle={profile.walkStepCm === null ? 'estimated from height' : 'measured'}
            trailing={`${profile.walkStepCm ?? walkStepOf(height)} / ${
              profile.runStepCm ?? runStepOf(height)
            } cm`}
          />
          <ActionLink label="Edit" onPress={() => setEditing(true)} />
        </Stack>
      </Card>
      <Text variant="bodySmall" tone="muted">
        Sent to the band on every connection — it has no way to report back what it stores.
      </Text>
      {sheet}
    </Stack>
  );
}
