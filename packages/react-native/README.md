# @askable-ui/react-native

React Native bindings for askable.

## Current slice

- `useAskable()` hook backed by `@askable-ui/core`
- `useAskableScreen()` hook for screen/navigation-aware context updates
- `<Askable ctx={...}>` wrapper that turns `onPress` / `onLongPress` into context updates

## Example

```tsx
import { Pressable, Text } from 'react-native';
import { Askable, useAskable } from '@askable-ui/react-native';

export function RevenueCard() {
  const { ctx, promptContext } = useAskable();

  return (
    <Askable ctx={ctx} meta={{ widget: 'revenue' }} text="Revenue card">
      <Pressable>
        <Text>Revenue</Text>
      </Pressable>
    </Askable>
  );
}
```

## Screen awareness

Use `useAskableScreen()` to push the active screen into context. It is designed to pair cleanly with React Navigation's `useIsFocused()` without forcing a hard dependency on React Navigation inside this package.

```tsx
import { useIsFocused } from '@react-navigation/native';
import { useAskable, useAskableScreen } from '@askable-ui/react-native';

export function RevenueScreen() {
  const isFocused = useIsFocused();
  const { ctx, promptContext } = useAskable();

  useAskableScreen({
    ctx,
    active: isFocused,
    meta: { screen: 'RevenueScreen' },
    text: 'Revenue screen',
  });

  return null;
}
```
