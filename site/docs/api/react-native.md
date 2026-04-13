# @askable-ui/react-native

React Native bindings for askable-ui.

This initial slice focuses on explicit mobile interactions: `useAskable()` provides a context backed by `@askable-ui/core`, and `<Askable />` turns `onPress` / `onLongPress` interactions into prompt-ready focus updates.

## Install

```bash
npm install @askable-ui/react-native @askable-ui/core
```

---

## `<Askable>`

Clones a single React Native pressable child and merges focus updates into its `onPress` and `onLongPress` handlers.

```tsx
import { Pressable, Text } from 'react-native';
import { Askable, useAskable } from '@askable-ui/react-native';

function RevenueCard() {
  const { ctx } = useAskable();

  return (
    <Askable ctx={ctx} meta={{ widget: 'revenue' }} text="Revenue card">
      <Pressable>
        <Text>Revenue</Text>
      </Pressable>
    </Askable>
  );
}
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `ctx` | `AskableContext` | Context instance that receives focus updates |
| `meta` | `Record<string, unknown> \| string` | Metadata pushed into the context on press |
| `text` | `string` | Optional human-readable label stored alongside `meta` |
| `children` | `ReactElement` | A single child that accepts `onPress` / `onLongPress` props |

---

## `useAskable(options?)`

Returns a React Native-friendly wrapper around an `AskableContext`.

```ts
import { useAskable } from '@askable-ui/react-native';

const { focus, promptContext, ctx } = useAskable();
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `ctx` | `AskableContext` | Reuse an existing context instead of creating a new one |
| `name` | `string` | Optional context name passed through to `createAskableContext()` |
| `viewport` | `boolean` | Optional viewport-aware core context mode |
| `events` | `AskableEvent[]` | Forwarded to the underlying core context |

**Returns:**

| Value | Type | Description |
|---|---|---|
| `focus` | `AskableFocus \| null` | Current focus created by press-driven updates |
| `promptContext` | `string` | Natural-language context string for your LLM prompt |
| `ctx` | `AskableContext` | Full context instance for `push()`, `clear()`, `toHistoryContext()`, etc. |

## Notes

- This adapter currently covers press-driven context updates.
- Navigation integration and ScrollView visibility tracking are planned follow-up work.
- Existing child `onPress` / `onLongPress` handlers are preserved and still run.
