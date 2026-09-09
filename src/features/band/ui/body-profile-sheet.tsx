import { useState } from 'react';

import { ageOf, runStepOf, walkStepOf, type BodyProfile } from '@/shared/domain';
import { Button, Field, Segmented, Sheet, Stack, Text } from '@/shared/ui';

import {
  draftOf,
  numberOf,
  profileErrors,
  toProfile,
  type ProfileDraft,
} from '../model/profile-form';

/**
 * Форма профиля тела.
 *
 * Это не «настройки приложения», а калибровка прибора: по этим числам браслет
 * считает дистанцию и расход энергии. Поэтому форма объясняет, что меняется от
 * ответа, и не даёт сохранить половину — с половиной устройство доберёт
 * остальное заводскими значениями, и результат будет выглядеть измеренным.
 */
export function BodyProfileSheet({
  visible,
  profile,
  onClose,
  onSave,
}: {
  visible: boolean;
  profile: BodyProfile;
  onClose: () => void;
  onSave: (patch: Partial<BodyProfile>) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Body profile">
      {/* Форма живёт только пока панель открыта. Так каждое открытие
          начинается с того, что записано сейчас, а не с прошлого черновика —
          человек мог закрыть панель именно потому, что напутал. Сброс через
          эффект делал бы то же самое лишним кругом отрисовки. */}
      {visible ? <ProfileForm profile={profile} onClose={onClose} onSave={onSave} /> : null}
    </Sheet>
  );
}

function ProfileForm({
  profile,
  onClose,
  onSave,
}: {
  profile: BodyProfile;
  onClose: () => void;
  onSave: (patch: Partial<BodyProfile>) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(profile));
  const [shown, setShown] = useState(false);

  const errors = profileErrors(draft);
  // Ошибки показываем после первой попытки сохранить, а не по ходу набора:
  // «Enter your height» под пустым полем, к которому человек ещё не притронулся,
  // читается как претензия, а не как подсказка.
  const show = (field: keyof typeof errors) => (shown ? errors[field] : undefined);

  const age = ageOf(draft.birth);
  const height = numberOf(draft.height);

  const save = () => {
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    onSave(toProfile(draft));
    onClose();
  };

  return (
    <Stack gap="lg">
      <Text variant="bodySmall" tone="muted">
        The band works out distance and energy from your body. Without these numbers it uses factory
        defaults, and every figure built on them is off by the same amount.
      </Text>

      <Stack gap="xs">
        <Field
          label="Height"
          hint="cm"
          keyboardType="number-pad"
          value={draft.height}
          onChangeText={(height) => setDraft({ ...draft, height })}
        />
        <FieldError text={show('height')} />
      </Stack>

      <Stack gap="xs">
        <Field
          label="Weight"
          hint="kg"
          keyboardType="decimal-pad"
          value={draft.weight}
          onChangeText={(weight) => setDraft({ ...draft, weight })}
        />
        <FieldError text={show('weight')} />
      </Stack>

      <Stack gap="xs">
        <Field
          label="Date of birth"
          hint="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          value={draft.birth}
          onChangeText={(birth) => setDraft({ ...draft, birth })}
        />
        {/* Возраст показан рядом как подтверждение: так видно, что дату
              поняли именно так, как человек её задумал. */}
        {age === null ? <FieldError text={show('birth')} /> : <Hint text={`${age} years old`} />}
      </Stack>

      <Stack gap="xs">
        <Text variant="caption" tone="muted">
          SEX
        </Text>
        <Segmented
          items={SEXES}
          value={draft.sex ?? ''}
          onChange={(value) => setDraft({ ...draft, sex: value === 'male' ? 'male' : 'female' })}
        />
        <FieldError text={show('sex')} />
      </Stack>

      <Stack gap="xs">
        <Text variant="caption" tone="muted">
          WORN ON
        </Text>
        <Segmented
          items={HANDS}
          value={draft.hand}
          onChange={(value) => setDraft({ ...draft, hand: value === 'right' ? 'right' : 'left' })}
        />
        <Hint text="The band tells a wrist raise from a hand movement by this." />
      </Stack>

      <Stack gap="sm">
        <Field
          label="Step length, walking"
          hint={height === null ? 'cm' : `${walkStepOf(height)} cm from your height`}
          keyboardType="number-pad"
          value={draft.walk}
          onChangeText={(walk) => setDraft({ ...draft, walk })}
        />
        <Field
          label="Step length, running"
          hint={height === null ? 'cm' : `${runStepOf(height)} cm from your height`}
          keyboardType="number-pad"
          value={draft.run}
          onChangeText={(run) => setDraft({ ...draft, run })}
        />
        <Hint text="Optional. Left empty, both are estimated from your height — measure them if distance looks wrong." />
      </Stack>

      <Button label="Save and send to the band" onPress={save} />
    </Stack>
  );
}

const SEXES = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
] as const;

const HANDS = [
  { value: 'left', label: 'Left wrist' },
  { value: 'right', label: 'Right wrist' },
] as const;

function FieldError({ text }: { text?: string }) {
  return text === undefined ? null : (
    <Text variant="bodySmall" tone="danger">
      {text}
    </Text>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <Text variant="bodySmall" tone="muted">
      {text}
    </Text>
  );
}
