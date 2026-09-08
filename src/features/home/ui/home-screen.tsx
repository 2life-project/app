import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { useBandConnected } from '@/shared/domain';
import { longDay, useToday, weekdayOf } from '@/shared/lib/day';
import { to } from '@/shared/nav';
import { theme } from '@/shared/theme';
import { GlassButton, PagedScreen, Stack, Text } from '@/shared/ui';

import { pendingCount, useDecisions, useHome } from '../model/home';
import { HOME_SECTIONS } from '../model/sections';

import { Activity } from './activity';
import { Nutrition } from './nutrition';
import { Overview } from './overview';
import { StateCard } from './state';
import { Supplements } from './supplements';
import { Wellbeing } from './wellbeing';

/**
 * Значок браслета подсвечен, только когда браслет действительно привязан:
 * зелёная подложка при пустом Bluetooth — это обещание, которого нет.
 */
const HEADER_ACTIONS = [
  { icon: 'watch', label: 'Устройство', href: to.device(), band: true },
  { icon: 'settings', label: 'Настройки', href: to.settings(), band: false },
  { icon: 'edit-2', label: 'Настроить виджеты', href: to.widgets(), band: false },
] as const;

/**
 * Дополнительный раздел перед штатными. Через него подключается служебная
 * страница браслета: она не зависит от ответа сервера и не может лежать внутри
 * Главной — фича не имеет права знать о другой фиче.
 */
export type LeadingSection = { value: string; label: string; page: ReactNode };

export function HomeScreen({ leading }: { leading?: LeadingSection } = {}) {
  const { date, timeZone } = useToday();
  const home = useHome(date, timeZone);
  const decisions = useDecisions();
  const bandPaired = useBandConnected();

  // Дату показываем свою, пока не приехала серверная: шапка не должна быть
  // пустой на время загрузки — день известен ещё до запроса.
  const day = home.data?.home.header.date ?? date;
  const streak = home.data?.home.header.checkinStreak.days ?? 0;
  const waiting = pendingCount(decisions.data);

  const header = (
    <Stack direction="row" justify="space-between" align="flex-start">
      <Stack gap="xs">
        <Text variant="display">{weekdayOf(day)}</Text>
        <Text variant="bodySmall" tone="muted">
          {longDay(day)}
        </Text>
        <Stack direction="row" gap="sm" align="center">
          {streak > 0 ? (
            <Text variant="bodySmall" tone="muted">
              {streak}-day check-in streak
            </Text>
          ) : null}
          {waiting > 0 ? (
            <Text variant="bodySmall" tone="muted">
              {waiting === 1 ? '1 decision waits' : `${waiting} decisions wait`}
            </Text>
          ) : null}
        </Stack>
      </Stack>
      <Stack direction="row" gap="sm">
        {HEADER_ACTIONS.map((action) => (
          <GlassButton
            key={action.label}
            size="sm"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.href)}
            // Зелёное кольцо на устройстве — статус связи, а не украшение.
            surfaceStyle={action.band && bandPaired ? styles.connected : undefined}>
            <Feather name={action.icon} size={18} color={theme.color.text} />
          </GlassButton>
        ))}
      </Stack>
    </Stack>
  );

  const sections = leading
    ? [{ value: leading.value, label: leading.label }, ...HOME_SECTIONS]
    : HOME_SECTIONS;

  const state = home.data;
  const dataPages = state
    ? [
        <Overview key="o" state={state} decisions={decisions} />,
        <Activity key="a" home={state.home} />,
        <Nutrition key="n" home={state.home} />,
        <Supplements key="s" home={state.home} />,
        <Wellbeing key="w" home={state.home} date={date} timeZone={timeZone} />,
      ]
    : HOME_SECTIONS.map((section) => <StateCard key={section.value} query={home} />);

  // Раздел браслета показываем всегда: он читает устройство напрямую и не ждёт
  // ответа сервера, поэтому не должен пропадать, пока Главная грузится.
  const pages = leading ? [leading.page, ...dataPages] : dataPages;

  return (
    <PagedScreen
      sections={sections}
      header={header}
      pages={pages}
      refreshing={home.refreshing}
      onRefresh={() => {
        home.refresh();
        decisions.refresh();
      }}
    />
  );
}

const styles = StyleSheet.create({
  connected: { borderWidth: 2, borderColor: theme.color.success.solid },
});
