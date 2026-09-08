import { type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Stack } from './stack';
import { Text } from './text';

export type FieldProps = TextInputProps & {
  label: string;
  /** Пример значения, а не повтор подписи: подсказка должна что-то добавлять. */
  hint?: string;
  /** Кнопка внутри поля справа: показать пароль, очистить, выбрать единицу. */
  trailing?: ReactNode;
};

/** Поле ввода с подписью. Единственный способ спросить у человека текст. */
export function Field({ label, hint, multiline, style, trailing, ...rest }: FieldProps) {
  return (
    <Stack gap="xs">
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      {/* Кнопка лежит НАД полем, а не рядом: иначе поле теряет ширину, и текст
          начинает прыгать при появлении и исчезновении кнопки. */}
      <View>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholder={hint}
          placeholderTextColor={theme.color.textMuted}
          style={[
            styles.input,
            multiline && styles.multiline,
            trailing !== undefined && styles.withTrailing,
            style,
          ]}
        />
        {trailing === undefined ? null : <View style={styles.trailing}>{trailing}</View>}
      </View>
    </Stack>
  );
}

/**
 * Поле выше минимальной зоны нажатия: на экране, где ввод — главное действие,
 * 44pt читаются как подпись, а не как поле.
 */
const HEIGHT = 52;
const MULTILINE_HEIGHT = 80;

const styles = StyleSheet.create({
  input: {
    height: HEIGHT,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    // Обводка обязательна: заливка поля полупрозрачная и на голом фоне экрана
    // сливается с ним — поле видно только внутри карточки.
    borderWidth: size.border,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surface,
    color: theme.color.text,
  },
  multiline: { height: MULTILINE_HEIGHT, paddingTop: space.md, textAlignVertical: 'top' },
  withTrailing: { paddingRight: HEIGHT },
  trailing: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
