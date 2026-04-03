# askable-streamlit

Streamlit binding for [askable](../../../README.md) — give your Streamlit app LLM awareness.

## Install

```bash
pip install askable-streamlit
```

## Quick start

```python
import streamlit as st
from askable.streamlit import askable_context

st.title("AI Dashboard")

# Render data with data-askable annotations
st.markdown(
    """
    <div data-askable='{"metric":"revenue","period":"Q3","value":"$2.3M"}'>
        <h3>Q3 Revenue: $2.3M</h3>
        <p>Down 12% month-over-month</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# Get the current focus context
focus = askable_context()

if focus:
    st.caption(f"Context: {focus['text'][:80]}...")

    if st.button("Ask AI about this"):
        prompt_context = (
            f"User is focused on: {focus['text']} "
            f"(metadata: {focus['meta']})"
        )
        # Pass prompt_context as your LLM system message
        response = call_your_llm(
            system=f"UI context: {prompt_context}",
            user="What should I know about this?",
        )
        st.write(response)
```

## How it works

`askable_context()` renders a hidden zero-height iframe component that:

1. Injects `@askable/core` into the parent Streamlit page via same-origin iframe access
2. Observes all `[data-askable]` elements on `document.body`
3. When the user clicks, focuses, or hovers an annotated element, sends the focus data back to Python as the component value

The returned dict has the same shape as `AskableFocus` from the JS core:

```python
{
    "meta": {"metric": "revenue", "period": "Q3"},  # parsed from data-askable
    "text": "Q3 Revenue: $2.3M",                     # element text (≤200 chars)
    "timestamp": 1711234567890,                       # unix ms
}
```

## Requirements

- Python ≥ 3.9
- Streamlit ≥ 1.28.0
- Works with all standard Streamlit deployment targets (local, Streamlit Cloud, etc.)

> **Note:** The component injects JS into the parent page via same-origin iframe access. This works in all standard Streamlit deployments because custom component frontends are served from the same origin as the app.

## License

MIT
