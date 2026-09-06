import type { AskableContextSource } from './types.js';
import { createAskableSource } from './sources.js';

/** Overlay category. Free-form strings are allowed for app-specific overlays. */
export type AskableDialogKind =
  | 'dialog'
  | 'alertdialog'
  | 'drawer'
  | 'sheet'
  | 'popover'
  | 'menu'
  | 'lightbox'
  | (string & {});

export interface AskableDialogEntry {
  /** Stable identifier for the overlay. */
  id: string;
  /** Human-readable title, such as the dialog heading. */
  title?: string | null;
  /** Overlay category. Defaults to "dialog". */
  kind?: AskableDialogKind;
  /** Whether the overlay blocks interaction with the page behind it. Defaults to true. */
  modal?: boolean;
  /** Supporting copy, such as the confirmation question being asked. */
  description?: string | null;
  /** Labels of the actions the overlay offers, in DOM order. */
  actions?: string[];
  /** Whether the overlay confirms a destructive action (delete, revoke, discard). */
  destructive?: boolean;
  /** What opened the overlay, such as a button label or route name. */
  trigger?: string | null;
  /** ISO timestamp of when the overlay opened. */
  openedAt?: string | null;
  /** App-specific metadata. */
  meta?: Record<string, unknown>;
}

export interface AskableDialogClosedEntry {
  /** Identifier of the overlay that closed. */
  id: string;
  /** Title the overlay had while open. */
  title: string | null;
  /** Overlay category. */
  kind: AskableDialogKind;
  /** Why it closed, such as "cancel", "confirm", "escape", or "dismiss". */
  reason: string | null;
  /** ISO timestamp of when the overlay closed. */
  closedAt: string | null;
}

export interface AskableDialogSourceSnapshot {
  /** Open overlays, bottom of the stack first. */
  open: AskableDialogEntry[];
  /** The overlay on top of the stack — what the user is actually looking at. */
  topmost: AskableDialogEntry | null;
  /** Number of open overlays. */
  openCount: number;
  /** Whether any overlay is open. */
  hasOpenDialog: boolean;
  /** Whether a modal overlay is blocking the page behind it. */
  isBlocking: boolean;
  /** Whether the topmost overlay confirms a destructive action. */
  isDestructive: boolean;
  /** The most recently closed overlay, if one has closed. */
  lastClosed: AskableDialogClosedEntry | null;
  /** ISO timestamp of the last open/close change. */
  lastChangedAt: string | null;
}

const DESTRUCTIVE_PATTERN = /\b(delete|remove|discard|revoke|destroy|erase|wipe|deactivate|cancel subscription|permanently)\b/i;

function normalizeEntry(entry: AskableDialogEntry): AskableDialogEntry {
  const kind = entry.kind ?? 'dialog';
  const actions = entry.actions ?? [];
  const destructive =
    entry.destructive ??
    (actions.some((action) => DESTRUCTIVE_PATTERN.test(action)) ||
      DESTRUCTIVE_PATTERN.test(entry.title ?? ''));

  return {
    ...entry,
    kind,
    // Popovers, menus, and tooltips do not block the page unless the app says so.
    modal: entry.modal ?? !(kind === 'popover' || kind === 'menu' || kind === 'tooltip'),
    title: entry.title ?? null,
    actions,
    destructive,
  };
}

/**
 * Builds a dialog snapshot from the current overlay stack. `open` is ordered
 * bottom-to-top, so the last entry is the overlay the user is looking at.
 */
export function buildDialogSnapshot(
  open: AskableDialogEntry[],
  lastClosed: AskableDialogClosedEntry | null = null,
  lastChangedAt: string | null = null,
): AskableDialogSourceSnapshot {
  const entries = open.map(normalizeEntry);
  const topmost = entries.length > 0 ? entries[entries.length - 1]! : null;

  return {
    open: entries,
    topmost,
    openCount: entries.length,
    hasOpenDialog: entries.length > 0,
    isBlocking: entries.some((entry) => entry.modal === true),
    isDestructive: topmost?.destructive === true,
    lastClosed,
    lastChangedAt,
  };
}

function describeEntry(entry: AskableDialogEntry): string {
  const label = entry.title ? `"${entry.title}"` : `untitled ${entry.kind}`;
  const parts = [`${entry.kind} ${label}`];
  if (entry.modal) parts.push('modal');
  if (entry.destructive) parts.push('destructive');
  if (entry.trigger) parts.push(`opened from ${entry.trigger}`);
  return parts.join(', ');
}

function defaultDescribe(snapshot: AskableDialogSourceSnapshot | null): string {
  if (!snapshot) return 'Dialog state is unavailable.';
  if (!snapshot.hasOpenDialog) {
    const closed = snapshot.lastClosed;
    if (closed) {
      const label = closed.title ? `"${closed.title}"` : closed.kind;
      const reason = closed.reason ? ` (${closed.reason})` : '';
      return `No overlay is open. Last closed: ${label}${reason}.`;
    }
    return 'No dialog, drawer, or popover is open.';
  }

  const lines: string[] = [];
  const top = snapshot.topmost!;

  if (snapshot.openCount === 1) {
    lines.push(`Open ${describeEntry(top)}.`);
  } else {
    lines.push(`${snapshot.openCount} overlays are stacked (bottom to top):`);
    for (const entry of snapshot.open) lines.push(`- ${describeEntry(entry)}`);
    lines.push(`Topmost: ${top.title ? `"${top.title}"` : top.kind}.`);
  }

  if (top.description) lines.push(top.description);
  if (top.actions && top.actions.length > 0) lines.push(`Actions: ${top.actions.join(', ')}.`);
  if (snapshot.isBlocking) lines.push('The page behind is blocked until it is dismissed.');
  if (snapshot.isDestructive) lines.push('This confirms a destructive action — do not advise confirming it casually.');

  return lines.join('\n');
}

export interface AskableCreateDialogSourceOptions {
  /** Custom describe function. */
  describe?: (snapshot: AskableDialogSourceSnapshot | null) => string;
  /** Override the source kind label. Defaults to "dialog". */
  kind?: string;
  /** Returns the current dialog snapshot. */
  getSnapshot: () => AskableDialogSourceSnapshot | null;
}

/**
 * Creates a dialog context source that tells AI assistants which modal, drawer,
 * or popover is open — so they answer about the overlay in front of the user
 * instead of the page behind it.
 *
 * @example
 * ```ts
 * // AI: "The 'Delete workspace' confirmation is open and blocking the page.
 * //      Choose Cancel if you want to keep the workspace."
 * ```
 */
export function createAskableDialogSource(
  options: AskableCreateDialogSourceOptions,
): AskableContextSource {
  const { describe, kind = 'dialog', getSnapshot } = options;
  return createAskableSource({
    kind,
    describe: describe ? () => describe(getSnapshot()) : () => defaultDescribe(getSnapshot()),
    state: () => {
      const snapshot = getSnapshot();
      return {
        hasOpenDialog: snapshot?.hasOpenDialog ?? false,
        openCount: snapshot?.openCount ?? 0,
        isBlocking: snapshot?.isBlocking ?? false,
        isDestructive: snapshot?.isDestructive ?? false,
        topmostId: snapshot?.topmost?.id ?? null,
        topmostTitle: snapshot?.topmost?.title ?? null,
      };
    },
    data: () => getSnapshot(),
  });
}

/* -------------------------------------------------------------------------- */
/* DOM detection                                                              */
/* -------------------------------------------------------------------------- */

const DIALOG_SELECTOR = [
  'dialog[open]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  '[popover]',
].join(',');

const MAX_ACTIONS = 8;

function matchesSafely(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function isVisible(el: Element): boolean {
  if (el.hasAttribute('hidden')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.hasAttribute('popover') && !matchesSafely(el, ':popover-open')) return false;
  // A native <dialog> is closed unless it carries `open`, whatever role or
  // aria-modal it also declares.
  if (el.tagName === 'DIALOG' && !el.hasAttribute('open')) return false;

  const view = el.ownerDocument?.defaultView;
  if (view?.getComputedStyle) {
    try {
      const style = view.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    } catch {
      /* getComputedStyle can throw on detached nodes — treat as visible. */
    }
  }
  return true;
}

function textOf(el: Element | null | undefined): string | null {
  const text = el?.textContent?.replace(/\s+/g, ' ').trim();
  return text ? text : null;
}

function labelledByText(el: Element, attribute: string): string | null {
  const ids = el.getAttribute(attribute);
  if (!ids) return null;
  const root = el.ownerDocument;
  if (!root) return null;
  const parts = ids
    .split(/\s+/)
    .map((id) => textOf(root.getElementById(id)))
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}

function inferKind(el: Element): AskableDialogKind {
  const explicit = el.getAttribute('data-askable-dialog-kind');
  if (explicit) return explicit;

  const role = el.getAttribute('role');
  if (role === 'alertdialog') return 'alertdialog';
  if (role === 'menu') return 'menu';
  if (role === 'tooltip') return 'tooltip';
  if (el.hasAttribute('popover')) return 'popover';
  return 'dialog';
}

function inferModal(el: Element, kind: AskableDialogKind): boolean {
  const ariaModal = el.getAttribute('aria-modal');
  if (ariaModal === 'true') return true;
  if (ariaModal === 'false') return false;
  if (matchesSafely(el, ':modal')) return true;
  return !(kind === 'popover' || kind === 'menu' || kind === 'tooltip');
}

function collectActions(el: Element): string[] {
  const actions: string[] = [];
  const buttons = el.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
  for (const button of Array.from(buttons)) {
    if (actions.length >= MAX_ACTIONS) break;
    const label =
      button.getAttribute('aria-label') ??
      (button instanceof HTMLInputElement ? button.value : null) ??
      textOf(button);
    if (label && !actions.includes(label)) actions.push(label);
  }
  return actions;
}

function elementToDialogEntry(el: Element, index: number): AskableDialogEntry {
  const kind = inferKind(el);
  const title =
    el.getAttribute('data-askable-dialog-title') ??
    el.getAttribute('aria-label') ??
    labelledByText(el, 'aria-labelledby') ??
    textOf(el.querySelector('h1, h2, h3, h4, h5, h6'));

  return {
    id: el.getAttribute('data-askable-dialog-id') || el.id || `dialog-${index + 1}`,
    title: title ?? null,
    kind,
    modal: inferModal(el, kind),
    description: labelledByText(el, 'aria-describedby'),
    actions: collectActions(el),
  };
}

/**
 * Scans the DOM for open overlays — native `<dialog open>`, ARIA dialogs,
 * `aria-modal` containers, and open popovers — in document order, so the last
 * entry is the topmost overlay.
 *
 * Use `data-askable-dialog-id`, `data-askable-dialog-title`, and
 * `data-askable-dialog-kind` to override what is detected.
 */
export function collectAskableDialogs(root: ParentNode | null = globalThis.document ?? null): AskableDialogEntry[] {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const elements = Array.from(root.querySelectorAll(DIALOG_SELECTOR)).filter(isVisible);
  return elements.map((el, index) => elementToDialogEntry(el, index));
}

export interface AskableDialogObserverOptions {
  /** Where to scan for overlays. Defaults to `document`. */
  root?: ParentNode | null;
  /** Called whenever the set of open overlays changes. */
  onChange: (entries: AskableDialogEntry[]) => void;
}

export interface AskableDialogObserverHandle {
  /** Re-scans the DOM and reports changes immediately. */
  refresh: () => void;
  /** Last reported entries. */
  getEntries: () => AskableDialogEntry[];
  /** Stops observing and releases listeners. */
  stop: () => void;
}

const OBSERVED_ATTRIBUTES = ['open', 'role', 'aria-modal', 'aria-hidden', 'hidden', 'popover', 'style', 'class'];

function signatureOf(entries: AskableDialogEntry[]): string {
  return entries
    .map((entry) =>
      `${entry.id}|${entry.kind}|${entry.modal}|${entry.title ?? ''}|${entry.description ?? ''}|${(entry.actions ?? []).join('/')}`)
    .join('\n');
}

/**
 * Watches the DOM and reports the open overlay stack as it changes. Starts
 * observing immediately and reports the initial stack synchronously.
 *
 * @example
 * ```ts
 * const observer = createAskableDialogObserver({ onChange: setDialogs });
 * // later
 * observer.stop();
 * ```
 */
export function createAskableDialogObserver(
  options: AskableDialogObserverOptions,
): AskableDialogObserverHandle {
  const root = options.root ?? globalThis.document ?? null;
  const doc: Document | null =
    root && 'ownerDocument' in root ? ((root as Element).ownerDocument ?? null) : (root as Document | null);

  let entries: AskableDialogEntry[] = [];
  let signature = '';
  let openedAt = new Map<string, string>();
  let scheduled = false;
  let stopped = false;

  function scan(): void {
    const next = collectAskableDialogs(root);
    const nextSignature = signatureOf(next);
    if (nextSignature === signature) return;

    const now = new Date().toISOString();
    const nextOpenedAt = new Map<string, string>();
    for (const entry of next) {
      const at = openedAt.get(entry.id) ?? now;
      nextOpenedAt.set(entry.id, at);
      entry.openedAt = at;
    }

    openedAt = nextOpenedAt;
    entries = next;
    signature = nextSignature;
    options.onChange(next);
  }

  function schedule(): void {
    if (scheduled || stopped) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!stopped) scan();
    });
  }

  const observer =
    typeof MutationObserver !== 'undefined' && root
      ? new MutationObserver(schedule)
      : null;

  observer?.observe(root as Node, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: OBSERVED_ATTRIBUTES,
  });

  // Native <dialog> and popovers fire `toggle`, which does not bubble.
  doc?.addEventListener('toggle', schedule, true);

  scan();

  return {
    refresh: scan,
    getEntries: () => entries,
    stop: () => {
      if (stopped) return;
      stopped = true;
      observer?.disconnect();
      doc?.removeEventListener('toggle', schedule, true);
    },
  };
}
