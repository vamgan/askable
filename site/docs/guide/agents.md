# Using askable-ui with coding agents

Many teams integrate libraries by prompting coding agents instead of reading every API page front-to-back. This guide gives you reusable markdown files and prompts you can drop into your own repo so those agents use `askable-ui` well.

## What to copy into your app repo

Recommended starting point:

1. Copy [`templates/AGENTS.askable-ui.md`](https://github.com/askable-ui/askable/blob/main/templates/AGENTS.askable-ui.md)
2. Save it in the root of your app repo as `AGENTS.md`
3. Replace the **Product-specific customization** section with your app's own rules
4. If your team frequently prompts agents directly, also copy useful snippets from [`templates/agent-prompts.askable-ui.md`](https://github.com/askable-ui/askable/blob/main/templates/agent-prompts.askable-ui.md)

That gives Claude/Cursor/Codex-style agents a stable, repo-local source of truth about how to use Askable in your product.

## What the template teaches the agent

The template is designed to help an agent make good decisions about:
- how to annotate meaningful UI surfaces
- when to use passive context updates vs explicit `ctx.select()` flows
- how to wire `promptContext` / `ctx.toContext()` into an AI request
- when to reuse a shared Askable context vs create an isolated one
- how to sanitize metadata/text before it reaches the model
- what common mistakes to avoid

## Recommended repo placement

Use this layout in your app repo:

```text
your-app/
├─ AGENTS.md
├─ src/
├─ app/
└─ ...
```

If your team also keeps reusable internal prompts, you can add something like:

```text
your-app/
├─ AGENTS.md
├─ docs/
│  └─ ai/
│     └─ askable-prompts.md
└─ ...
```

## How to customize `AGENTS.md`

At minimum, replace the product-specific section with:
- your primary AI surfaces
- which flows should use passive context vs explicit Ask AI buttons
- sensitive fields that must never reach the model
- metadata conventions you want agents to preserve
- any domain vocabulary the assistant should prefer

Example customization:

```md
## Product-specific customization

- primary AI surfaces:
  - sales dashboard copilot
  - account page assistant
- preferred interaction model:
  - passive context on dashboards
  - explicit `ctx.select()` for "Ask AI" buttons on account cards
- never send these fields to the model:
  - customer_internal_id
  - stripe_customer_id
  - auth tokens
- required metadata conventions:
  - always include `widget`
  - include `team` and `dateRange` on analytics panels
```

## Recommended annotation strategy for agents

Teach agents to prefer:

### Structured metadata

```tsx
<Askable
  meta={{
    widget: 'revenue-chart',
    metric: 'monthly-recurring-revenue',
    period: selectedRange,
  }}
>
  <RevenueChart />
</Askable>
```

### Curated text for visual widgets

```tsx
<Askable
  meta={{ widget: 'pipeline-chart' }}
  data-askable-text={[
    'Pipeline overview for the current team.',
    'Most open value is concentrated in enterprise deals.',
    'Late-stage opportunities increased from last week.',
  ].join('\n')}
>
  <PipelineChart />
</Askable>
```

### Explicit Ask AI button flows when needed

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

## Prompt-boundary guidance

A coding agent should keep Askable context close to the actual AI request boundary.

```ts
const result = await streamText({
  model,
  system: [
    'You are a helpful analytics assistant.',
    promptContext,
  ].join('\n\n'),
  messages,
});
```

If current focus alone is not enough, the agent can consider:
- `ctx.toHistoryContext(n)`
- `ctx.toContext({ history: n })`
- `ctx.toViewportContext()` when on-screen context matters

## Noise-control and safety checklist

Your copied `AGENTS.md` should push agents toward:
- removing internal-only IDs unless truly needed
- redacting secrets/tokens
- trimming noisy text
- avoiding giant serialized objects in `meta`
- preferring product semantics over implementation details

Example sanitization:

```tsx
const askable = useAskable({
  sanitizeMeta: ({ internalId, accessToken, ...safe }) => safe,
  sanitizeText: (text) => text.replace(/\s+/g, ' ').trim(),
});
```

## Common mistakes to warn agents about

Include or preserve warnings like these in your app-level `AGENTS.md`:
- do not annotate every tiny element by default
- do not dump raw API payloads into `meta`
- do not rely only on flattened DOM text for charts/dashboards
- do not accidentally merge unrelated AI surfaces into one context
- do not ship inspector/debug tooling in production

## Copy-paste prompts for agents

If you want more guided one-shot prompts, use the examples in:
- [`templates/agent-prompts.askable-ui.md`](https://github.com/askable-ui/askable/blob/main/templates/agent-prompts.askable-ui.md)

That file includes prompts for:
- adding Askable to an existing app
- improving existing annotations
- wiring context into a chat boundary
- adding safe sanitization
- implementing explicit Ask AI button flows

## When to use this guide

Reach for these templates when:
- onboarding Askable into an existing product with the help of a coding agent
- handing repo-specific integration rules to Claude/Cursor/Codex
- standardizing Askable usage across multiple teams or apps
- reducing repeated prompt-writing for the same integration style
