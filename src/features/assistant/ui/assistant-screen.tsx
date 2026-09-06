import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Stack as RouterStack } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';
import { Button, Card, GlassButton, Pressable, Stack, Text } from '@/shared/ui';

import { CONVERSATION, DISCLAIMER, INTRO, PLACEHOLDER, SUGGESTIONS } from '../model/chat';

/**
 * Ассистент приходит шитом поверх текущего экрана: он отвечает про то, что
 * человек сейчас видит, и закрывать ради него экран незачем. Высота — чуть
 * больше половины, как в макете; шапку и «ручку» рисует сама система.
 */
/** Опции маршрута берём из самого роутера: свой тип разошёлся бы с ним. */
type ScreenOptions = ComponentProps<typeof RouterStack.Screen>['options'];

export const AssistantScreenOptions: ScreenOptions = {
  title: 'Ассистент',
  presentation: 'formSheet',
  // Высота из макета: шит закрывает чуть больше половины экрана, но тянется
  // на всю — длинный ответ читают целиком, а не в щели.
  sheetAllowedDetents: [0.62, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.xl,
  headerShown: false,
};

export function AssistantScreen() {
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <GlassButton size={HEADER_BUTTON} accessibilityLabel="История диалогов">
          <Feather name="rotate-ccw" size={size.icon.sm} color={theme.color.text} />
        </GlassButton>
        <Text variant="subtitle">2Life Assistant</Text>
        <GlassButton
          size={HEADER_BUTTON}
          accessibilityLabel="Закрыть"
          onPress={() => router.back()}>
          <Feather name="x" size={size.icon.sm} color={theme.color.text} />
        </GlassButton>
      </View>

      <Text variant="bodySmall" tone="muted" style={styles.centered}>
        {INTRO}
      </Text>

      {SUGGESTIONS.map((row) => (
        <View key={row.join()} style={styles.suggestions}>
          {row.map((suggestion) => (
            <Button key={suggestion} label={suggestion} variant="tonal" size="sm" />
          ))}
        </View>
      ))}

      {/* Вопрос человека — заливкой, ответ — карточкой: так видно, где чья
          реплика, без подписей «вы» и «ассистент». */}
      <View style={styles.questionRow}>
        <View style={styles.question}>
          <Text variant="label" tone="onHighlight">
            {CONVERSATION.question}
          </Text>
        </View>
      </View>

      <Card variant="flat" style={styles.answer}>
        <Stack gap="sm">
          <Text>{CONVERSATION.answer}</Text>
          <Text variant="footnote" tone="muted">
            {CONVERSATION.sources}
          </Text>
        </Stack>
      </Card>

      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder={PLACEHOLDER}
          placeholderTextColor={theme.color.textMuted}
          // Клавиатура закрывается по «отправить», а не по кнопке «готово»:
          // ассистенту пишут одной фразой.
          returnKeyType="send"
        />
        <Pressable accessibilityLabel="Отправить" haptic>
          <LinearGradient colors={theme.color.warm} style={styles.send}>
            <Feather name="arrow-up" size={size.icon.sm} color={theme.color.neutral.on} />
          </LinearGradient>
        </Pressable>
      </View>

      <Text variant="footnote" tone="muted" style={styles.centered}>
        {DISCLAIMER}
      </Text>
    </View>
  );
}

const HEADER_BUTTON = 32;
const SEND_BUTTON = 33;
const INPUT_HEIGHT = 43;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.color.background,
    paddingHorizontal: space.cardX,
    paddingTop: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centered: { textAlign: 'center' },
  suggestions: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  questionRow: { alignItems: 'flex-end' },
  question: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    backgroundColor: theme.color.highlight.solid,
  },
  answer: { backgroundColor: theme.color.surfaceInner },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: INPUT_HEIGHT,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceInner,
  },
  input: { flex: 1, color: theme.color.text },
  send: {
    width: SEND_BUTTON,
    height: SEND_BUTTON,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
