# askable

> Give any UI element LLM awareness in one line.

[![npm](https://img.shields.io/npm/v/@askable/core?color=6366f1&label=npm)](https://www.npmjs.com/package/@askable/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@askable/core?color=6366f1&label=core)](https://bundlephobia.com/package/@askable/core)
[![license](https://img.shields.io/npm/l/@askable/core?color=6366f1)](./LICENSE)

```html
<div data-askable='{"metric":"revenue","period":"Q3","value":"$2.3M"}'>
  Revenue: $2.3M
</div>
```

```ts
ctx.toPromptContext();
// → "User is focused on: — metric: revenue, period: Q3, value: $2.3M — value "Revenue: $2.3M""
```

That one string goes straight into your LLM prompt. Your AI assistant now knows exactly what the user was looking at.

---

## The problem

When users ask your AI assistant a question, it has no idea what they're looking at.

They click a revenue chart. They hover over an error row. They focus a specific form field. Your LLM receives `"what's wrong?"` with zero context — and gives a useless generic answer.

You *could* manually track every interaction. Write a custom event system. Serialize state. Thread it through your app. Keep it in sync.

Or you could add one attribute.

---

## The solution

Annotate elements with `data-askable`. That's it.

```html
<!-- Any element, any framework -->
<section data-askable='{"chart":"churn-rate","cohort":"Q3","value":"4.2%"}'>
  ...your chart...
</section>
```

```ts
import { createAskableContext } from '@askable/core';

const ctx = createAskableContext();
ctx.observe(document); // watches clicks, focus, and hover — automatically

// Wire into any LLM call
const messages = [
  { role: 'system', content: `UI context: ${ctx.toPromptContext()}` },
  { role: 'user', content: userQuestion },
];
```

---

## Install

```bash
# Core (zero dependencies, any framework)
npm install @askable/core

# React bindings
npm install @askable/react @askable/core
```

---

## How it works

**1. Annotate** — Add `data-askable` to elements that carry meaning. Use JSON for structured metadata, or a plain string for simple labels.

**2. Observe** — Call `ctx.observe(document)` once. Askable attaches listeners to every `[data-askable]` element and watches for new ones via `MutationObserver`. Zero configuration.

**3. Inject** — Call `ctx.toPromptContext()` when building your LLM request. It returns a ready-to-use natural language string describing what the user is currently focused on.

```
User clicks "Delete Account" button
        ↓
ctx.getFocus() → { meta: { action: "delete", target: "account" }, text: "Delete Account", ... }
        ↓
ctx.toPromptContext() → "User is focused on: — action: delete, target: account — value "Delete Account""
        ↓
LLM prompt: "UI context: User is focused on: — action: delete, target: account..."
        ↓
AI gives a specific, contextual answer about account deletion
```

---

## Framework examples

### React

```tsx
import { Askable, useAskable } from '@askable/react';

// Step 1: wrap elements
function Dashboard() {
  return (
    <Askable meta={{ chart: 'monthly-revenue', period: 'Q3', value: '$128k' }}>
      <RevenueChart />
    </Askable>
  );
}

// Step 2: read context anywhere
function AICopilot() {
  const { promptContext } = useAskable();

  async function ask(question: string) {
    return fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: `UI context: ${promptContext}` },
          { role: 'user', content: question },
        ],
      }),
    });
  }

  return <input onKeyDown={(e) => e.key === 'Enter' && ask(e.currentTarget.value)} />;
}
```

### Vue

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createAskableContext } from '@askable/core';

const ctx = createAskableContext();
const promptContext = ref('');

onMounted(() => {
  ctx.observe(document);
  ctx.on('focus', () => { promptContext.value = ctx.toPromptContext(); });
});

onUnmounted(() => ctx.destroy());
</script>

<template>
  <div data-askable='{"panel":"user-settings","section":"billing"}'>
    <BillingPanel />
  </div>
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createAskableContext } from '@askable/core';

  const ctx = createAskableContext();
  let promptContext = '';

  onMount(() => {
    ctx.observe(document);
    ctx.on('focus', () => { promptContext = ctx.toPromptContext(); });
  });

  onDestroy(() => ctx.destroy());
</script>

<section data-askable='{"page":"analytics","view":"cohort-retention"}'>
  <CohortChart />
</section>
```

### Vanilla JS

```html
<script type="module">
  import { createAskableContext } from 'https://esm.sh/@askable/core';

  const ctx = createAskableContext();
  ctx.observe(document);

  ctx.on('focus', () => {
    document.querySelector('#ai-context').value = ctx.toPromptContext();
  });
</script>

<div data-askable='{"widget":"error-log","severity":"critical","count":3}'>
  3 critical errors
</div>
```

---

## LLM integration

### Vercel AI SDK

```ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ctx } from './askable'; // your shared ctx instance

export async function POST(req: Request) {
  const { messages } = await req.json();

  return streamText({
    model: openai('gpt-4o'),
    system: `You are a helpful UI assistant.\n\nCurrent UI context:\n${ctx.toPromptContext()}`,
    messages,
  });
}
```

### OpenAI SDK

```ts
import OpenAI from 'openai';

const openai = new OpenAI();

async function askWithContext(question: string) {
  return openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a helpful UI assistant.\n\n${ctx.toPromptContext()}`,
      },
      { role: 'user', content: question },
    ],
  });
}
```

### Anthropic Claude

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function askWithContext(question: string) {
  return client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: `You are a helpful UI assistant.\n\n${ctx.toPromptContext()}`,
    messages: [{ role: 'user', content: question }],
  });
}
```

---

## Why askable?

| | Manual tracking | askable |
|---|---|---|
| Setup | Write custom event system | Add `data-askable` attribute |
| Maintenance | Update tracking on every UI change | Attributes live in markup |
| Serialization | Custom code per component | `ctx.toPromptContext()` |
| Framework support | Re-implement per framework | One core, thin adapters |
| Bundle cost | Your code | ~1kb gzipped |
| MutationObserver | Manual wiring | Built-in |
| Type safety | DIY | Full TypeScript types |

---

## Packages

| Package | Description | Size |
|---|---|---|
| [`@askable/core`](./packages/core) | Framework-agnostic core. Zero dependencies. | ~1kb gz |
| [`@askable/react`](./packages/react) | React `<Askable>` component + `useAskable` hook | ~0.5kb gz |

---

## API reference

### `createAskableContext()`

Returns a new `AskableContext` instance.

### `ctx.observe(el)`

Starts watching `el` for `[data-askable]` elements. Attaches `click`, `focus`, and `mouseenter` listeners. Uses `MutationObserver` to handle dynamically added elements.

### `ctx.getFocus()`

Returns `{ meta, text, element, timestamp }` or `null`.

### `ctx.on('focus', handler)` / `ctx.off('focus', handler)`

Subscribe/unsubscribe to focus events.

### `ctx.toPromptContext()`

Returns a natural language string like:
```
User is focused on: — metric: revenue, period: Q3 — value "Revenue: $2.3M"
```

### `ctx.destroy()`

Removes all listeners and observers. Call on cleanup.

---

## License

MIT
