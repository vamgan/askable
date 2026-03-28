# askable-django

Django binding for [askable](../../../README.md) — template tags + auto-inject middleware for LLM-aware Django apps.

## Install

```bash
pip install askable-django
```

Add to `INSTALLED_APPS` and optionally `MIDDLEWARE`:

```python
INSTALLED_APPS = [
    ...
    "askable",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "askable.middleware.AskableMiddleware",  # auto-injects askable/core before </body>
    ...
]
```

## Template tags

```django
{% load askable_tags %}

{# Wrap any block — renders a <div data-askable="..."> around your content #}
{% askable meta=chart_meta %}
    <canvas id="revenue-chart"></canvas>
{% endaskable %}

{# Custom tag name #}
{% askable meta=chart_meta as="section" %}
    {{ chart|safe }}
{% endaskable %}

{# Inline — just the attribute, for when you control the element #}
<div {% askable_attr meta=chart_meta %} class="panel">
    {{ content }}
</div>

{# Manual script tag (if you're NOT using AskableMiddleware) #}
{% askable_script %}
```

### `meta` argument

Pass a Python dict or string. Dicts are JSON-serialized automatically:

```python
# views.py
def dashboard(request):
    return render(request, "dashboard.html", {
        "chart_meta": {
            "metric": "revenue",
            "period": "Q3",
            "value": "$2.3M",
        }
    })
```

```django
{% askable meta=chart_meta %}
    <canvas id="chart"></canvas>
{% endaskable %}
{# renders: <div data-askable='{"metric":"revenue","period":"Q3","value":"$2.3M"}'> #}
```

## Middleware

`AskableMiddleware` automatically injects `@askable/core` before `</body>` on every HTML response. No template changes needed — just add it to `MIDDLEWARE`.

The injected script:
- Loads `@askable/core` from `esm.sh` CDN (~1kb gzipped)
- Calls `ctx.observe(document.body)`
- Keeps `window.__askableContext` updated with the current prompt string

Your own JavaScript can read the context as:

```js
const context = window.__askableContext;
// → "User is focused on: — metric: revenue, period: Q3 — value "Q3 Revenue""
// or "No UI element is currently focused."
```

Wire it into your AI chat handler:

```js
async function askAI(question) {
  return fetch('/ai/chat/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context: window.__askableContext,
    }),
  });
}
```

```python
# views.py
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def ai_chat(request):
    data = json.loads(request.body)
    question = data['question']
    ui_context = data.get('context', 'No UI element is currently focused.')

    response = your_llm_client.chat(
        system=f"You are a helpful assistant.\n\nCurrent UI context:\n{ui_context}",
        user=question,
    )
    return JsonResponse({'answer': response})
```

## Flask / FastAPI

No dedicated package needed — it's the same pattern without the middleware:

```html
{# Jinja2 template #}
<div data-askable='{{ chart_meta | tojson }}'>
  {{ chart_content }}
</div>

{# Before </body> #}
<script type="module">
  import { createAskableContext } from 'https://esm.sh/@askable/core@0.1.0';
  const ctx = createAskableContext();
  ctx.observe(document.body);
  ctx.on('focus', () => { window.__askableContext = ctx.toPromptContext(); });
</script>
```

## License

MIT
