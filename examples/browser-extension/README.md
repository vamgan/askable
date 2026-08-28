# Browser Extension Companion

This example shows the no-site-code path for Askable. A Manifest V3 extension
captures selected text, the last focused/clicked DOM element, or a full-page
snapshot from any normal web page, then sends it through an
`@askable-ui/bridge` envelope to the extension background worker.

It is intentionally provider-neutral. The popup shows the prompt context so you
can paste it into ChatGPT, Claude, Cursor, or your own chat UI. The background
worker receives the structured envelope and is the place to forward it to a
side panel, local app, webhook, or MCP companion.

## Run it

```bash
npm install
npm run build
```

Then load the built extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `examples/browser-extension/dist`.

Open any `http://` or `https://` page, select some text or click an element,
then open the extension popup and choose a capture mode.

## What it captures

| Mode | Packet capture | Sources included |
|---|---|---|
| Selected text | `text-selection` | selected text, page title, URL |
| Focused element | `element-focus` | last clicked/focused DOM element plus page summary |
| Full page | `full-page` | title, URL, headings, links, and bounded page text |

On apps that already use `data-askable`, the same content script also observes
Askable focus. On arbitrary sites, it falls back to DOM and page sources from
`@askable-ui/core`.

## Architecture

```text
popup button
  -> content script capture command
  -> @askable-ui/core page/DOM sources
  -> @askable-ui/bridge browser-extension transport
  -> background worker validates AskableBridgeEnvelope
```

The content script uses:

- `createAskableContext()` to keep the current page state.
- `createAskablePageSource()` for unannotated page text, headings, selected
  text, and links.
- `createAskableDOMSource()` for the last clicked or focused element.
- `createBrowserExtensionTransport()` to send the same envelope any other
  Askable bridge receiver would get.

## Privacy notes

This example marks captures as explicit because the user presses the popup
button. It does not redact page text by default, so do not forward envelopes to
remote services until your extension applies a sanitizer or asks the user for
the right consent.

Chrome extensions cannot inject content scripts into browser-owned pages such as
`chrome://extensions`, the Chrome Web Store, or restricted enterprise pages.
