"""Template tags for askable-django.

Usage in templates::

    {% load askable_tags %}

    {# Block tag — wraps content in a data-askable element #}
    {% askable meta=chart_meta as="section" %}
        <canvas id="revenue-chart"></canvas>
    {% endaskable %}

    {# Inline tag — render just the data-askable attribute value #}
    <div {% askable_attr meta=chart_meta %}>...</div>

    {# Script tag — manually include the @askable/core snippet #}
    {% askable_script %}
"""

from __future__ import annotations

import json

from django import template
from django.utils.html import format_html, mark_safe

register = template.Library()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CDN = "https://esm.sh/@askable/core@0.1.0"

_SCRIPT_TAG = (
    '<script type="module">'
    f'import{{createAskableContext}}from"{_CDN}";'
    "const ctx=createAskableContext();"
    "ctx.observe(document.body);"
    "</script>"
)


def _serialize_meta(meta: dict | str) -> str:
    """Return a safe JSON or plain string for data-askable."""
    if isinstance(meta, dict):
        return json.dumps(meta, separators=(",", ":"))
    return str(meta)


# ---------------------------------------------------------------------------
# {% askable meta=... as="div" %}...{% endaskable %}
# ---------------------------------------------------------------------------


class AskableNode(template.Node):
    def __init__(
        self,
        meta_var: template.FilterExpression,
        as_tag: str,
        nodelist: template.NodeList,
    ) -> None:
        self.meta_var = meta_var
        self.as_tag = as_tag
        self.nodelist = nodelist

    def render(self, context: template.Context) -> str:
        meta = self.meta_var.resolve(context)
        meta_str = _serialize_meta(meta)
        inner = self.nodelist.render(context)
        tag = self.as_tag
        # Use format_html for the wrapper; inner content is already rendered
        # (trusted template output) so mark it safe explicitly.
        return format_html(
            "<{tag} data-askable='{meta}'>{inner}</{tag}>",
            tag=tag,
            meta=meta_str,
            inner=mark_safe(inner),
        )


@register.tag("askable")
def do_askable(parser: template.base.Parser, token: template.base.Token) -> AskableNode:
    """Block tag that wraps content in a ``data-askable`` element.

    Syntax::

        {% askable meta=my_var %}...{% endaskable %}
        {% askable meta=my_var as="section" %}...{% endaskable %}
    """
    bits = token.split_contents()
    tag_name = bits[0]

    meta_expr: template.FilterExpression | None = None
    as_tag = "div"

    for bit in bits[1:]:
        if bit.startswith("meta="):
            meta_expr = parser.compile_filter(bit[len("meta="):])
        elif bit.startswith("as="):
            as_tag = bit[len("as="):].strip("\"'")

    if meta_expr is None:
        raise template.TemplateSyntaxError(
            f"'{tag_name}' tag requires a 'meta=' argument"
        )

    nodelist = parser.parse(("endaskable",))
    parser.delete_first_token()

    return AskableNode(meta_expr, as_tag, nodelist)


# ---------------------------------------------------------------------------
# {% askable_attr meta=... %} — renders just the attribute (no wrapper tag)
# ---------------------------------------------------------------------------


class AskableAttrNode(template.Node):
    def __init__(self, meta_var: template.FilterExpression) -> None:
        self.meta_var = meta_var

    def render(self, context: template.Context) -> str:
        meta = self.meta_var.resolve(context)
        return format_html("data-askable='{}'", _serialize_meta(meta))


@register.tag("askable_attr")
def do_askable_attr(
    parser: template.base.Parser, token: template.base.Token
) -> AskableAttrNode:
    """Inline tag — renders the ``data-askable`` attribute only.

    Useful when you control the wrapping element yourself::

        <div {% askable_attr meta=chart_meta %} class="panel">...</div>
    """
    bits = token.split_contents()
    meta_expr: template.FilterExpression | None = None

    for bit in bits[1:]:
        if bit.startswith("meta="):
            meta_expr = parser.compile_filter(bit[len("meta="):])

    if meta_expr is None:
        raise template.TemplateSyntaxError(
            f"'{bits[0]}' tag requires a 'meta=' argument"
        )

    return AskableAttrNode(meta_expr)


# ---------------------------------------------------------------------------
# {% askable_script %} — renders the <script> CDN tag
# ---------------------------------------------------------------------------


@register.simple_tag
def askable_script() -> str:
    """Render the ``@askable/core`` script tag.

    Use this if you're **not** using ``AskableMiddleware`` (which injects
    the script automatically).  Place it just before ``</body>``::

        {% load askable_tags %}
        ...
        {% askable_script %}
      </body>
    """
    return mark_safe(_SCRIPT_TAG)
