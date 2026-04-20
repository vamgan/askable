# askable-ui prompts for coding agents

Use these prompts when asking a coding agent to add or improve `askable-ui` integration in an application.

## 1. Add askable-ui to an existing app

```md
Add `askable-ui` to this app.

Goals:
- annotate meaningful UI surfaces with structured metadata
- expose prompt-ready UI context to the existing AI/chat flow
- avoid noisy or sensitive metadata in prompts
- prefer curated summaries for charts/dashboards instead of raw DOM text

Implementation rules:
- use passive Askable focus updates for exploratory UI
- use explicit `ctx.select()` for any "Ask AI" button flow
- reuse shared contexts only when multiple components should power the same AI surface
- create isolated contexts for unrelated panels/agents
- add sanitization if any internal IDs, tokens, or hidden fields could reach the model
- add or update docs/comments where the integration pattern would be non-obvious

Deliver:
- the code changes
- a short explanation of the chosen annotation strategy
- any risks or follow-up recommendations
```

## 2. Improve existing annotations

```md
Review this app's existing `askable-ui` integration and improve it.

Focus on:
- low-signal or noisy metadata
- missing annotations on important surfaces
- dashboards/charts that should use curated `data-askable-text`
- accidental context sharing between unrelated panels
- missing explicit `ctx.select()` usage on button-driven AI flows
- opportunities to sanitize metadata/text before prompt serialization

For each change, prefer product semantics over implementation detail.
```

## 3. Wire context into the chat boundary

```md
Find where this app sends requests to the LLM/chat backend and wire `askable-ui` context into that boundary.

Requirements:
- keep the context injection close to the actual AI request
- use the existing Askable context for the relevant UI surface
- prefer concise prompt context over dumping large state objects
- preserve current app behavior when no Askable focus is active
- document the integration point briefly if it would be hard to rediscover later
```

## 4. Add safe sanitization

```md
Audit the current `askable-ui` metadata/text for privacy and noise.

Please:
- identify fields that should not reach the model
- add `sanitizeMeta`, `sanitizeText`, or a better text extraction strategy where needed
- keep business-meaningful context intact
- summarize what was redacted and why
```

## 5. Add an explicit Ask AI button pattern

```md
Implement an explicit "Ask AI" button flow for the main annotated card/list items in this app.

Requirements:
- use `ctx.select()` to pin the relevant Askable element before opening/submitting to the assistant
- keep the button behavior predictable on desktop and mobile
- preserve any existing click handlers
- update docs/examples if the pattern becomes a recommended user flow
```
