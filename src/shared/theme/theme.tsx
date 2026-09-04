import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { buildTheme, type Theme, type ThemeMode } from './semantic';

/** Обе темы считаются один раз при загрузке модуля: их всего две и они статичны. */
export const themes: Record<ThemeMode, Theme> = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};

const ThemeContext = createContext<Theme>(themes.light);

/** Тема следует системной настройке телефона. Своего переключателя пока нет. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = themes[scheme === 'dark' ? 'dark' : 'light'];

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Стили, зависящие от темы, без пересборки на каждый рендер: результат
 * запоминается по объекту темы, а тем всего две.
 *
 * ```ts
 * const useStyles = createThemedStyles((t) => ({ card: { backgroundColor: t.color.surface } }));
 * ```
 */
export function createThemedStyles<T extends Styles>(factory: (theme: Theme) => T) {
  const cache = new Map<Theme, T>();

  return function useThemedStyles(): T {
    const theme = useTheme();

    return useMemo(() => {
      const cached = cache.get(theme);
      if (cached) return cached;

      const created = StyleSheet.create(factory(theme));
      cache.set(theme, created);
      return created;
    }, [theme]);
  };
}
