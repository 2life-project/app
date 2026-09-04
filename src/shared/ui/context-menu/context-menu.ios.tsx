import { Button, Host, Menu } from '@expo/ui/swift-ui';

import type { ContextMenuProps } from './model';

/**
 * На iOS меню отдаётся системе: она сама рисует его стеклом, анимирует
 * появление, обрабатывает haptics и уводит фокус. Повторять это на React
 * бессмысленно — получится похоже, но не так.
 */
export function ContextMenu({ items, triggerSymbol }: ContextMenuProps) {
  return (
    <Host matchContents>
      <Menu label="" systemImage={triggerSymbol}>
        {items.map((item) => (
          <Button
            key={item.id}
            label={item.label}
            systemImage={item.symbol}
            role={item.tone === 'danger' ? 'destructive' : undefined}
            onPress={item.onPress}
          />
        ))}
      </Menu>
    </Host>
  );
}
