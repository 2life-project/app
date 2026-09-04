import type { ReactNode } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';

export type ContextMenuItem = {
  id: string;
  label: string;
  onPress: () => void;
  /** `danger` — необратимое действие: система красит его сама. */
  tone?: 'default' | 'danger';
  /** Символ строки меню на iOS. */
  symbol?: SFSymbol;
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  /**
   * Триггер на iOS. Меню там рисует система, и его кнопка описывается символом,
   * а не React-узлом: внутри нативного меню живёт SwiftUI, куда обычную вёрстку
   * не положить. На остальных платформах используется `renderTrigger`.
   */
  triggerSymbol?: SFSymbol;
  /** Триггер на всех платформах, кроме iOS. Свяжите его нажатие с `open`. */
  renderTrigger: (open: () => void) => ReactNode;
  accessibilityLabel?: string;
};
