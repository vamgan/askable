# Dialog & Overlay Source

When a modal is open, everything the assistant knows about the page is wrong. The user is not looking at the dashboard behind the overlay — they are looking at "Delete workspace — Cancel / Delete", and that is what they are asking about.

`useAskableDialogSource` tracks the stack of open dialogs, drawers, sheets, popovers, and menus, so the assistant answers about the overlay in front of the user. It is available as a framework hook in React, Vue, Svelte 5, Solid, and Qwik, as `AskableDialogSourceService` in Angular, and as `createAskableDialogSource` in `@askable-ui/core`.

## Driving it from your dialog state

```tsx
import { useAskableDialogSource } from '@askable-ui/react';

function WorkspaceSettings() {
  const { snapshot, openDialog, closeDialog } = useAskableDialogSource();

  return (
    <button
      onClick={() =>
        openDialog({
          id: 'delete-workspace',
          title: 'Delete Acme',
          kind: 'alertdialog',
          description: 'This removes every project in the workspace.',
          actions: ['Cancel', 'Delete workspace'],
        })
      }
    >
      Delete workspace
    </button>
  );
}
```

The assistant now sees:

```
Open alertdialog "Delete Acme", modal, destructive.
This removes every project in the workspace.
Actions: Cancel, Delete workspace.
The page behind is blocked until it is dismissed.
This confirms a destructive action — do not advise confirming it casually.
```

### Actions

| Method | Description |
|---|---|
| `openDialog(entry)` | Push an overlay onto the stack, or update it if the id is already open. |
| `closeDialog(id, reason?)` | Close one overlay and record why (`"cancel"`, `"confirm"`, `"escape"`, …). |
| `closeTopmost(reason?)` | Close whatever is on top — what <kbd>Esc</kbd> does. |
| `setDialogs(entries)` | Replace the whole stack at once. |
| `closeAll(reason?)` | Close everything, e.g. on a route change. |

## Zero-config auto-detection

If your overlays are native `<dialog>` elements, ARIA dialogs, or popovers, you do not have to wire anything per dialog:

```tsx
useAskableDialogSource({ autoDetect: true });
```

Auto-detection watches the DOM (a `MutationObserver` plus native `toggle` events) and reports what is open:

| Detected | Matched by |
|---|---|
| Native dialogs | `dialog[open]` |
| ARIA dialogs | `[role="dialog"]`, `[role="alertdialog"]` |
| Modal containers | `[aria-modal="true"]` |
| Popovers | `[popover]` while open |

Hidden, `aria-hidden`, and `display: none` elements are skipped. Titles come from `aria-label`, `aria-labelledby`, or the first heading inside; descriptions from `aria-describedby`; action labels from the buttons inside.

Override any of it with data attributes:

```html
<div role="dialog"
     data-askable-dialog-id="checkout"
     data-askable-dialog-title="Checkout"
     data-askable-dialog-kind="sheet">
```

Use either `autoDetect` or the actions — with auto-detection on, the DOM is the source of truth and manual calls are overwritten on the next mutation.

## The snapshot

```ts
{
  open: [           // bottom of the stack first
    { id: 'filters', title: 'Filters', kind: 'drawer', modal: true },
    { id: 'delete-workspace', title: 'Delete Acme', kind: 'alertdialog', modal: true, destructive: true },
  ],
  topmost: { id: 'delete-workspace', /* … */ },
  openCount: 2,
  hasOpenDialog: true,
  isBlocking: true,      // a modal overlay blocks the page behind it
  isDestructive: true,   // the topmost overlay confirms a destructive action
  lastClosed: null,
  lastChangedAt: '2026-09-06T12:00:00.000Z',
}
```

`modal` defaults to `true`, except for popovers, menus, and tooltips — set it explicitly when your overlay behaves differently. `destructive` is inferred from the title and action labels (delete, remove, revoke, discard, …); pass it yourself to override the guess.

## Other frameworks

```vue
<script setup>
import { useAskableDialogSource } from '@askable-ui/vue';
const { snapshot, openDialog, closeTopmost } = useAskableDialogSource({ autoDetect: true });
</script>
```

```svelte
<script lang="ts">
  import { useAskableDialogSource } from '@askable-ui/svelte/useAskableDialogSource.svelte';
  const dialogs = useAskableDialogSource({ autoDetect: true });
</script>
```

```ts
// Angular
@Component({ providers: [AskableDialogSourceService] })
export class ShellComponent implements OnInit {
  private readonly dialogs = inject(AskableDialogSourceService);
  ngOnInit() { this.dialogs.init({ autoDetect: true }); }
}
```

## Without a framework

```ts
import {
  buildDialogSnapshot,
  collectAskableDialogs,
  createAskableDialogObserver,
  createAskableDialogSource,
} from '@askable-ui/core';

let snapshot = buildDialogSnapshot(collectAskableDialogs());
ctx.registerSource('dialogs', createAskableDialogSource({ getSnapshot: () => snapshot }));

const observer = createAskableDialogObserver({
  onChange: (entries) => { snapshot = buildDialogSnapshot(entries, snapshot.lastClosed, new Date().toISOString()); },
});
// observer.stop() when you tear the page down
```

## See also

- [Custom Sources](/guide/sources) — writing your own source
- [Core API](/api/core#createaskabledialogsource-options) — full type reference
