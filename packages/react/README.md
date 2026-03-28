# @askable/react

React bindings for [askable](../../README.md) — give your UI components LLM awareness in one line.

## Install

```bash
npm install @askable/react @askable/core
```

## Quick Start

```tsx
import { Askable, useAskable } from '@askable/react';

// Wrap any element to make it LLM-aware
function Dashboard() {
  return (
    <Askable meta={{ chart: 'revenue', period: 'Q3', value: '$2.3M' }}>
      <RevenueChart />
    </Askable>
  );
}

// Access focus context anywhere in your tree
function AIChatInput() {
  const { focus, promptContext } = useAskable();

  async function handleSubmit(question: string) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: `UI context: ${promptContext}` },
          { role: 'user', content: question },
        ],
      }),
    });
    return res.json();
  }

  return (
    <div>
      {focus && <p>Asking about: {JSON.stringify(focus.meta)}</p>}
      <input onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e.currentTarget.value)} />
    </div>
  );
}
```

## API

### `<Askable meta={...} as="div">`

Renders any element (default: `div`) with a `data-askable` attribute. The `meta` prop accepts an object or string.

```tsx
<Askable meta={{ widget: 'churn-rate', value: '4.2%' }} as="section">
  <ChurnChart />
</Askable>

<Askable meta="main navigation" as="nav">
  <NavLinks />
</Askable>
```

**Props:**
- `meta` — structured metadata attached to the element (`Record<string, unknown> | string`)
- `as` — HTML tag to render (default: `"div"`)
- All other props are forwarded to the underlying element

### `useAskable()`

Returns reactive focus state from the shared global `AskableContext`.

```ts
const { focus, promptContext, ctx } = useAskable();
```

**Returns:**
- `focus: AskableFocus | null` — current focus state (updates on click, hover, or keyboard focus)
- `promptContext: string` — natural language string ready to inject into LLM prompts
- `ctx: AskableContext` — the underlying context instance for advanced use

The hook manages a shared singleton context, so multiple calls across your app share the same observer. The context is automatically destroyed when the last consumer unmounts.

## License

MIT
