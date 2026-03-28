# @askable/svelte

Svelte 4 bindings for [askable](../../README.md) — give your UI components LLM awareness in one line.

## Install

```bash
npm install @askable/svelte @askable/core
```

## Quick Start

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createAskableStore } from '@askable/svelte';
  import Askable from '@askable/svelte/Askable.svelte';

  const { focus, promptContext, destroy } = createAskableStore();
  onDestroy(destroy);

  async function ask(question: string) {
    return fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: `UI context: ${$promptContext}` },
          { role: 'user', content: question },
        ],
      }),
    });
  }
</script>

<Askable meta={{ chart: 'revenue', period: 'Q3', value: '$128k' }} as="section">
  <RevenueChart />
</Askable>

{#if $focus}
  <p>Focused: {JSON.stringify($focus.meta)}</p>
{/if}
```

## API

### `<Askable meta={...} as="div">`

Renders any element (default: `div`) with a `data-askable` attribute. Accepts a `<slot />`.

### `createAskableStore()`

Returns Svelte stores backed by a core `AskableContext`.

```ts
const { focus, promptContext, ctx, destroy } = createAskableStore();
// focus: Readable<AskableFocus | null>
// promptContext: Readable<string>
```

## License

MIT
