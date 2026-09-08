import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Stack as RouterStack } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { to } from '@/shared/nav';
import { radius, size, space, theme } from '@/shared/theme';
import { ActionLink, Button, Card, GlassButton, Pressable, Sheet, Stack, Text } from '@/shared/ui';

import { DISCLAIMER, INTRO, MEMO, PLACEHOLDER, SUGGESTIONS } from '../model/chat';
import { useChat } from '../model/use-chat';

/** Опции маршрута берём из самого роутера: свой тип разошёлся бы с ним. */
type ScreenOptions = ComponentProps<typeof RouterStack.Screen>['options'];

/**
 * Ассистент приходит шитом поверх текущего экрана: он отвечает про то, что
 * человек сейчас видит, и закрывать ради него экран незачем. Высота — чуть
 * больше половины, как в макете; шапку и «ручку» рисует сама система.
 */
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
  const chat = useChat();
  const [draft, setDraft] = useState('');
  const [memo, setMemo] = useState(false);

  const ask = (question: string) => {
    void chat.ask(question);
    setDraft('');
  };

  // `collapsable={false}` обязателен: нативный шит раскладывает содержимое сам
  // и ждёт не больше двух своих детей. Без пометки React Native схлопывает эту
  // обёртку, шит видит все строки диалога сразу и рисует ленту поверх шапки.
  return (
    <View style={styles.sheet} collapsable={false}>
      <View style={styles.header} collapsable={false}>
        <GlassButton
          size={HEADER_BUTTON}
          accessibilityLabel="История диалогов"
          onPress={() => router.push(to.threads())}>
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

      <ScrollView
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        showsVerticalScrollIndicator={false}>
        <Text variant="bodySmall" tone="muted" style={styles.centered}>
          {INTRO}
        </Text>

        {SUGGESTIONS.map((row) => (
          <View key={row.join()} style={styles.suggestions}>
            {row.map((suggestion) => (
              <Button
                key={suggestion}
                label={suggestion}
                variant="tonal"
                size="sm"
                onPress={() => ask(suggestion)}
              />
            ))}
          </View>
        ))}

        {/* Вопрос человека — заливкой, ответ — карточкой: так видно, где чья
            реплика, без подписей «вы» и «ассистент». */}
        {chat.messages.map((message) =>
          message.side === 'you' ? (
            <View key={message.id} style={styles.questionRow}>
              <View style={styles.question}>
                <Text variant="label" tone="onHighlight">
                  {message.text}
                </Text>
              </View>
            </View>
          ) : (
            <Card key={message.id} variant="flat" style={styles.answer}>
              <Text>{message.text}</Text>
            </Card>
          ),
        )}

        {chat.asking ? (
          <Text variant="bodySmall" tone="muted" style={styles.centered}>
            Thinking…
          </Text>
        ) : null}
        {chat.failed ? (
          <Text variant="bodySmall" tone="danger" style={styles.centered}>
            The assistant did not answer. Try again.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.field}>
        <Pressable accessibilityLabel="Голосовая заметка" onPress={() => setMemo(true)}>
          <Feather name="mic" size={size.icon.md} color={theme.color.textMuted} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={PLACEHOLDER}
          placeholderTextColor={theme.color.textMuted}
          value={draft}
          onChangeText={setDraft}
          // Клавиатура закрывается по «отправить», а не по кнопке «готово»:
          // ассистенту пишут одной фразой.
          returnKeyType="send"
          onSubmitEditing={() => ask(draft)}
        />
        <Pressable accessibilityLabel="Отправить" haptic onPress={() => ask(draft)}>
          <LinearGradient colors={theme.color.warm} style={styles.send}>
            <Feather name="arrow-up" size={size.icon.sm} color={theme.color.neutral.on} />
          </LinearGradient>
        </Pressable>
      </View>

      <Text variant="footnote" tone="muted" style={styles.centered}>
        {DISCLAIMER}
      </Text>

      <Sheet
        visible={memo}
        onClose={() => setMemo(false)}
        title="Voice memo"
        action={<ActionLink label={MEMO.secondary} onPress={() => setMemo(false)} />}>
        <Stack gap="md" align="center">
          <Text tone="muted" style={styles.centered}>
            {MEMO.transcript}
          </Text>
          <Text variant="headline">{MEMO.title}</Text>
          <Text variant="footnote" tone="muted">
            {MEMO.meta}
          </Text>
          <Button label={MEMO.primary} onPress={() => setMemo(false)} />
          <Text variant="footnote" tone="muted" style={styles.centered}>
            {MEMO.note}
          </Text>
        </Stack>
      </Sheet>
    </View>
  );
}

const HEADER_BUTTON = 32;
const SEND_BUTTON = 33;
const INPUT_HEIGHT = 43;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    // Шит обрезает своё содержимое: без этого лента диалога рисуется поверх
    // шапки и выше края панели — iOS не обрезает переполнение сама.
    overflow: 'hidden',
    backgroundColor: theme.color.background,
    paddingHorizontal: space.cardX,
    paddingTop: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centered: { textAlign: 'center' },
  thread: { flex: 1, minHeight: 0 },
  threadContent: { gap: space.sm, paddingBottom: space.sm },
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
    gap: space.sm,
    height: INPUT_HEIGHT,
    paddingLeft: space.md,
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
