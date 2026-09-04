import { Placeholder, Screen } from '@/shared/ui';

/** Ассистент приходит шитом поверх текущего экрана, а не заменяет его. */
export const AssistantScreenOptions = { title: 'Ассистент', presentation: 'modal' } as const;

export function AssistantScreen() {
  return (
    <Screen>
      <Placeholder note="Диалог с контекстом текущего экрана, история тредов, голосовая заметка." />
    </Screen>
  );
}
