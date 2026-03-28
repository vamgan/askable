"""askable-streamlit — LLM-aware focus context for Streamlit apps."""

import os
import streamlit.components.v1 as components

# Toggle to True when shipping a built frontend bundle
_RELEASE = False

_parent_dir = os.path.dirname(os.path.abspath(__file__))
_frontend_dir = os.path.join(_parent_dir, "frontend")

_component_func = components.declare_component(
    "askable_context",
    path=_frontend_dir,
)


def askable_context(key: str = "askable") -> dict | None:
    """Return the current UI focus context as a dict, or None if nothing is focused.

    The component observes all ``[data-askable]`` elements in the Streamlit page
    and tracks the last interacted element (click / focus / hover).

    Args:
        key: Streamlit component key. Use a unique key if you render multiple
             instances (unusual — one per page is the typical pattern).

    Returns:
        dict with keys:
            ``meta``      — parsed data-askable value (dict or str)
            ``text``      — element text content, truncated to 200 chars
            ``timestamp`` — unix ms when focus was captured
        or ``None`` if no element has been interacted with yet.

    Example::

        import streamlit as st
        from askable.streamlit import askable_context

        focus = askable_context()

        if focus:
            st.write(f"You're looking at: {focus['text']}")
            prompt_context = (
                f"User is focused on: {focus['text']} "
                f"(metadata: {focus['meta']})"
            )
            # Pass prompt_context as the system message to your LLM
    """
    return _component_func(key=key, default=None)
