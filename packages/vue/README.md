# @askable/vue

Vue 3 bindings for [askable](../../README.md) — give your UI components LLM awareness in one line.

## Install

```bash
npm install @askable/vue @askable/core
```

## Quick Start

```vue
<script setup lang="ts">
import { Askable, useAskable } from '@askable/vue';

const { focus, promptContext } = useAskable();

async function ask(question: string) {
  return fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `UI context: ${promptContext.value}` },
        { role: 'user', content: question },
      ],
    }),
  });
}
</script>

<template>
  <Askable :meta="{ chart: 'revenue', period: 'Q3', value: '$128k' }" as="section">
    <RevenueChart />
  </Askable>
</template>
```

## API

### `<Askable :meta="..." as="div">`

Renders any element (default: `div`) with a `data-askable` attribute.

### `useAskable()`

Returns reactive focus state from the shared global context.

```ts
const { focus, promptContext, ctx } = useAskable();
// focus: Ref<AskableFocus | null>
// promptContext: ComputedRef<string>
// ctx: AskableContext
```

## License

MIT
