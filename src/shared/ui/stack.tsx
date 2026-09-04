import { View, type FlexAlignType, type ViewProps } from 'react-native';

import { spacing } from '@/shared/theme';

export type StackProps = ViewProps & {
  direction?: 'row' | 'column';
  gap?: keyof typeof spacing;
  align?: FlexAlignType;
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  wrap?: boolean;
  grow?: boolean;
};

/** Раскладка через токены отступов вместо россыпи margin по компонентам. */
export function Stack({
  direction = 'column',
  gap = 'none',
  align,
  justify,
  wrap = false,
  grow = false,
  style,
  ...rest
}: StackProps) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: direction,
          gap: spacing[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          flexGrow: grow ? 1 : 0,
        },
        style,
      ]}
    />
  );
}
