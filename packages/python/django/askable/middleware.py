"""AskableMiddleware — auto-injects @askable/core before </body>."""

from __future__ import annotations

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin

# Inlined script tag: loads @askable/core from CDN and starts observing.
# Kept on a single line so the byte-search for </body> is unambiguous.
_ASKABLE_SCRIPT: bytes = (
    b'<script type="module">'
    b'import{createAskableContext}from"https://esm.sh/@askable/core@0.1.0";'
    b"const ctx=createAskableContext();"
    b"ctx.observe(document.body);"
    b'ctx.on("focus",()=>{'
    b"window.__askableContext=ctx.toPromptContext();"
    b"});"
    b"</script>"
)

_CLOSING_BODY: bytes = b"</body>"


class AskableMiddleware(MiddlewareMixin):
    """Inject the askable core script into every HTML response.

    Add to ``settings.MIDDLEWARE`` (after ``SecurityMiddleware``)::

        MIDDLEWARE = [
            "django.middleware.security.SecurityMiddleware",
            "askable.middleware.AskableMiddleware",
            ...
        ]

    The script is injected only when:
    - The response has a ``Content-Type`` that contains ``text/html``
    - The response body contains a literal ``</body>`` closing tag

    The injected snippet loads ``@askable/core`` from the esm.sh CDN,
    calls ``ctx.observe(document.body)``, and keeps
    ``window.__askableContext`` up to date with the natural-language
    prompt string.  Your own JS can read it as::

        const context = window.__askableContext;
    """

    def process_response(
        self, request: HttpRequest, response: HttpResponse
    ) -> HttpResponse:
        content_type: str = response.get("Content-Type", "")
        if "text/html" not in content_type:
            return response

        if not hasattr(response, "content"):
            return response

        if _CLOSING_BODY not in response.content:
            return response

        response.content = response.content.replace(
            _CLOSING_BODY,
            _ASKABLE_SCRIPT + _CLOSING_BODY,
            1,  # replace only the first occurrence
        )
        # Recalculate Content-Length after body modification
        if response.has_header("Content-Length"):
            response["Content-Length"] = len(response.content)

        return response
