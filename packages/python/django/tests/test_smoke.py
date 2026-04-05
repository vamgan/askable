"""Smoke tests for askable-django.

Covers:
- Module imports
- AskableMiddleware: injects script into HTML responses
- AskableMiddleware: skips non-HTML responses
- AskableMiddleware: skips responses without </body>
- AskableMiddleware: recalculates Content-Length
- Template tag: {% askable %} block
- Template tag: {% askable_attr %}
- Template tag: {% askable_script %}
"""

import django
from django.conf import settings

if not settings.configured:
    settings.configure(
        INSTALLED_APPS=[
            "django.contrib.contenttypes",
            "django.contrib.auth",
            "askable",
        ],
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": ":memory:",
            }
        },
        TEMPLATES=[
            {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [],
                "APP_DIRS": True,
                "OPTIONS": {"context_processors": []},
            }
        ],
    )
    django.setup()


# ---------------------------------------------------------------------------
# Import checks
# ---------------------------------------------------------------------------


def test_import_middleware():
    from askable.middleware import AskableMiddleware  # noqa: F401


def test_import_apps():
    from askable.apps import AskableConfig  # noqa: F401


def test_import_template_tags():
    from askable.templatetags import askable_tags  # noqa: F401


# ---------------------------------------------------------------------------
# AskableMiddleware
# ---------------------------------------------------------------------------


def _make_middleware():
    from askable.middleware import AskableMiddleware

    def dummy_get_response(request):
        pass

    return AskableMiddleware(dummy_get_response)


def test_middleware_injects_script_into_html():
    from django.http import HttpResponse

    mw = _make_middleware()
    response = HttpResponse(
        b"<html><body><p>Hello</p></body></html>",
        content_type="text/html; charset=utf-8",
    )
    result = mw.process_response(None, response)

    assert b"<script" in result.content
    assert b"createAskableContext" in result.content
    assert b"</body>" in result.content
    # Script should appear before </body>
    script_pos = result.content.index(b"<script")
    body_close_pos = result.content.index(b"</body>")
    assert script_pos < body_close_pos


def test_middleware_skips_non_html():
    from django.http import HttpResponse

    mw = _make_middleware()
    original_content = b'{"key": "value"}'
    response = HttpResponse(original_content, content_type="application/json")
    result = mw.process_response(None, response)

    assert result.content == original_content


def test_middleware_skips_when_no_closing_body():
    from django.http import HttpResponse

    mw = _make_middleware()
    original_content = b"<html><body><p>No closing tag</p>"
    response = HttpResponse(original_content, content_type="text/html")
    result = mw.process_response(None, response)

    assert result.content == original_content


def test_middleware_recalculates_content_length():
    from django.http import HttpResponse

    mw = _make_middleware()
    body = b"<html><body><p>Hello</p></body></html>"
    response = HttpResponse(body, content_type="text/html")
    response["Content-Length"] = str(len(body))

    result = mw.process_response(None, response)

    assert int(result["Content-Length"]) == len(result.content)


def test_middleware_replaces_only_first_body_tag():
    from django.http import HttpResponse

    mw = _make_middleware()
    response = HttpResponse(
        b"<html><body></body></body></html>",
        content_type="text/html",
    )
    result = mw.process_response(None, response)

    # Only the first </body> should be preceded by the script
    content = result.content.decode()
    assert content.count("<script") == 1


# ---------------------------------------------------------------------------
# Template tags
# ---------------------------------------------------------------------------


def _render(template_str: str, context: dict | None = None):
    from django.template import Context, Template

    tpl = Template("{% load askable_tags %}" + template_str)
    return tpl.render(Context(context or {}))


def test_askable_block_tag_renders_wrapper():
    html = _render(
        '{% askable meta=data %}<span>content</span>{% endaskable %}',
        {"data": {"metric": "revenue", "value": "100"}},
    )
    assert 'data-askable=' in html
    assert "revenue" in html
    assert "<span>content</span>" in html


def test_askable_block_tag_default_div():
    html = _render(
        '{% askable meta=data %}inner{% endaskable %}',
        {"data": "hello"},
    )
    assert html.startswith("<div")
    assert html.endswith("</div>")


def test_askable_block_tag_custom_element():
    html = _render(
        '{% askable meta=data as="section" %}inner{% endaskable %}',
        {"data": "hello"},
    )
    assert "<section" in html
    assert "</section>" in html


def test_askable_attr_tag_renders_attribute():
    html = _render(
        '<div {% askable_attr meta=data %}>content</div>',
        {"data": {"chart": "bar"}},
    )
    assert "data-askable=" in html
    assert "chart" in html


def test_askable_script_tag_renders_script():
    html = _render("{% askable_script %}")
    assert "<script" in html
    assert "createAskableContext" in html
    assert "esm.sh" in html
