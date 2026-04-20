# AGENTS.md template for projects using askable-ui

> Copy this file into the root of your app as `AGENTS.md`, then customize the product-specific sections.

## Project goal

This application uses `askable-ui` to give the app's AI assistant accurate UI context.

When working in this repo:
- preserve or improve `askable-ui` annotations
- prefer structured metadata over brittle DOM scraping
- keep AI context focused on what the user is actually looking at
- avoid passing noisy, redundant, or sensitive UI data into prompts

## What askable-ui is for

`askable-ui` is the UI-context layer for the app's AI features.

Use it to:
- annotate meaningful UI elements with structured metadata
- track what the user is focused on
- generate prompt-ready context via `promptContext`, `ctx.toPromptContext()`, `ctx.toHistoryContext()`, or `ctx.toContext()`
- support both passive context updates and explicit "Ask AI" interactions

Do not treat it as:
- analytics tracking
- a generic DOM scraping tool
- a replacement for the app's LLM SDK or chat API

## Preferred integration patterns

### 1. Annotate meaningful UI surfaces

Prefer high-signal metadata:

```tsx
<Askable
  meta={{
    widget: 'revenue-chart',
    metric: 'monthly-recurring-revenue',
    period: selectedRange,
    unit: 'usd',
  }}
>
  <RevenueChart />
</Askable>
```

Good metadata usually includes:
- widget/component identity
- business meaning
- active filters/range/segment
- units or status when relevant

Avoid:
- huge raw objects
- internal IDs unless the AI truly needs them
- duplicate metadata already obvious from other fields

### 2. Prefer `data-askable-text` or curated text for visual widgets

For charts, dashboards, and dense cards, prefer a curated summary instead of trusting flattened DOM text.

```tsx
<Askable
  meta={{ widget: 'pipeline-chart', team: activeTeam }}
  data-askable-text={[
    'Pipeline overview for the active team.',
    'Open pipeline is concentrated in enterprise deals.',
    'Late-stage opportunities increased week over week.',
  ].join('\n')}
>
  <PipelineChart />
</Askable>
```

### 3. Use passive context for exploratory UI

Use passive focus updates for dashboards, tables, forms, and pages where the user naturally clicks, focuses, or hovers relevant elements.

```tsx
const { promptContext } = useAskable({ events: ['click', 'hover'] });
```

### 4. Use explicit `ctx.select()` for button-driven AI flows

If the app has an explicit "Ask AI" button, make the button pin context intentionally.

```tsx
function RevenueCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { ctx } = useAskable({ events: ['click'] });

  return (
    <Askable ref={ref} meta={{ widget: 'revenue-card' }}>
      <RevenueChart />
      <button
        onClick={() => {
          if (ref.current) ctx.select(ref.current);
          openAssistant();
        }}
      >
        Ask AI
      </button>
    </Askable>
  );
}
```

### 5. Reuse shared context intentionally

If multiple components should agree on one AI surface, keep them on the same Askable context.

```tsx
const chartCtx = useAskable({ name: 'chart-surface', events: ['click', 'hover'] });
```

If one region should stay isolated from another, use a separate named context or a custom `ctx`.

## AI boundary guidance

When sending requests to the app's LLM backend:
- include `promptContext` or `ctx.toContext(...)` at the AI boundary
- keep the integration close to the chat/completion request
- prefer structured, minimal context over dumping the whole page state

Example:

```ts
const result = await streamText({
  model,
  system: [
    'You are a helpful product assistant.',
    promptContext,
  ].join('\n\n'),
  messages,
});
```

For multi-turn UI-aware interactions, prefer:
- `ctx.toHistoryContext(n)` when recent focus history matters
- `ctx.toContext({ history: n })` when combining current + history
- `ctx.toViewportContext()` only when on-screen context is actually needed

## Sanitization and safety rules

Before exposing metadata/text to the AI:
- remove secrets, tokens, internal references, and unnecessary IDs
- redact hidden/internal-only fields
- keep text concise and human-meaningful

Prefer built-in sanitization hooks when needed:

```tsx
const askable = useAskable({
  sanitizeMeta: ({ internalId, accessToken, ...safe }) => safe,
  sanitizeText: (text) => text.replace(/\s+/g, ' ').trim(),
});
```

## Common mistakes to avoid

Do not:
- annotate every tiny element by default
- pass giant API payloads into `meta`
- rely only on raw `textContent` for charts or dashboards
- mix unrelated AI surfaces into one context accidentally
- mount inspector/debug tooling in production builds
- assume the AI needs implementation details when product semantics are enough

## Framework-specific notes

### React
- use `useAskable()` for shared hook-managed contexts
- use `<AskableInspector />` or `useAskable({ inspector: true })` only in development
- if using custom `events`, `name`, or `ctx`, pass the same configuration to the inspector

### Vue
- use `useAskable()` in `setup`
- if enabling inspector, prefer `useAskable({ inspector: true, events: [...] })`

### Svelte
- `createAskableStore()` creates a private context by default
- share a custom `ctx` explicitly when multiple components must use the same context

### React Native
- prefer explicit `ctx` sharing across screen helpers/components
- use app-local debug UI instead of the DOM inspector overlay

## Product-specific customization

Replace this section with app-specific guidance:
- primary AI surfaces in this app:
- preferred interaction model (passive vs explicit button):
- sensitive fields that must never reach the model:
- required metadata conventions:
- important business terms the agent should preserve:

## Acceptance criteria for askable-ui-related changes

Any change touching the AI/UI-context flow should:
- keep or improve annotation quality
- preserve the intended context-sharing model
- avoid introducing noisy or sensitive prompt context
- update docs/examples when the preferred integration pattern changes
- validate that the assistant still receives the intended context in realistic usage
