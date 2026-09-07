import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { radius, space, theme } from '@/shared/theme';

import { Stack } from './stack';
import { Text } from './text';

export type FieldProps = TextInputProps & {
  label: string;
  /** Пример значения, а не повтор подписи: подсказка должна что-то добавлять. */
  hint?: string;
};

/** Поле ввода с подписью. Единственный способ спросить у человека текст. */
export function Field({ label, hint, multiline, style, ...rest }: FieldProps) {
  return (
    <Stack gap="xs">
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholder={hint}
        placeholderTextColor={theme.color.textMuted}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </Stack>
  );
}

const HEIGHT = 44;
const MULTILINE_HEIGHT = 72;

const styles = StyleSheet.create({
  input: {
    height: HEIGHT,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.color.surfaceInner,
    color: theme.color.text,
  },
  multiline: { height: MULTILINE_HEIGHT, paddingTop: space.md, textAlignVertical: 'top' },
});
