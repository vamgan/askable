import { createEffect, createSignal, onCleanup } from 'solid-js';
import { createAskableDialogSource, createAskableDialogObserver, buildDialogSnapshot } from '@askable-ui/core';
import type {
  AskableCreateDialogSourceOptions,
  AskableDialogClosedEntry,
  AskableDialogEntry,
  AskableDialogKind,
  AskableDialogSourceSnapshot,
} from '@askable-ui/core';
import { useAskableSource, type UseAskableSourceOptions, type UseAskableSourceResult } from './useAskableSource.js';

export type { AskableDialogClosedEntry, AskableDialogEntry, AskableDialogKind, AskableDialogSourceSnapshot };

export interface UseAskableDialogSourceOptions
  extends UseAskableSourceOptions,
    Omit<AskableCreateDialogSourceOptions, 'getSnapshot'> {
  /** Source registration id. Defaults to "dialogs". */
  id?: string;
  /** Overlays already open on mount, bottom of the stack first. */
  open?: AskableDialogEntry[];
  /**
   * Detect native `<dialog>`, ARIA dialogs, and popovers from the DOM instead of
   * calling `openDialog`/`closeDialog` by hand. Manual actions are ignored while
   * this is on — the DOM is the source of truth.
   */
  autoDetect?: boolean;
  /** Where auto-detection scans. Defaults to `document`. */
  root?: ParentNode | null;
}

export interface UseAskableDialogSourceResult extends UseAskableSourceResult {
  snapshot: () => AskableDialogSourceSnapshot | null;
  openDialog: (entry: AskableDialogEntry) => void;
  closeDialog: (id: string, reason?: string) => void;
  closeTopmost: (reason?: string) => void;
  setDialogs: (entries: AskableDialogEntry[]) => void;
  closeAll: (reason?: string) => void;
}

function toClosedEntry(entry: AskableDialogEntry, reason: string | null): AskableDialogClosedEntry {
  return {
    id: entry.id,
    title: entry.title ?? null,
    kind: entry.kind ?? 'dialog',
    reason,
    closedAt: new Date().toISOString(),
  };
}

/**
 * SolidJS primitive that tracks which modal, drawer, or popover is open and
 * exposes it to AI assistants so they answer about the overlay in front of the
 * user instead of the page behind it.
 *
 * @example
 * ```tsx
 * const { snapshot, openDialog, closeDialog } = useAskableDialogSource();
 * openDialog({ id: 'delete', title: 'Delete workspace', actions: ['Cancel', 'Delete'] });
 * ```
 *
 * @example
 * ```tsx
 * // Zero-config: read open overlays straight from the DOM.
 * useAskableDialogSource({ autoDetect: true });
 * ```
 */
export function useAskableDialogSource(
  options: UseAskableDialogSourceOptions = {},
): UseAskableDialogSourceResult {
  const { id = 'dialogs', open: initialOpen = [], autoDetect = false, root, describe, kind, enabled, ctx, name, events } = options;

  const [snapshot, setSnapshot] = createSignal<AskableDialogSourceSnapshot | null>(
    buildDialogSnapshot(initialOpen, null, initialOpen.length > 0 ? new Date().toISOString() : null),
  );

  const source = createAskableDialogSource({ describe, kind, getSnapshot: snapshot });
  const result = useAskableSource(id, source, { enabled, ctx, name, events });

  function updateSnapshot(updater: (prev: AskableDialogSourceSnapshot) => AskableDialogSourceSnapshot): void {
    setSnapshot((prev) => (prev ? updater(prev) : prev));
    result.notifyChanged();
  }

  function setDialogs(entries: AskableDialogEntry[]): void {
    updateSnapshot((prev) => buildDialogSnapshot(entries, prev.lastClosed, new Date().toISOString()));
  }

  function openDialog(entry: AskableDialogEntry): void {
    updateSnapshot((prev) => {
      const openedAt = entry.openedAt ?? new Date().toISOString();
      const existing = prev.open.findIndex((item) => item.id === entry.id);
      const next = existing >= 0
        ? prev.open.map((item, index) => (index === existing ? { ...entry, openedAt: item.openedAt ?? openedAt } : item))
        : [...prev.open, { ...entry, openedAt }];
      return buildDialogSnapshot(next, prev.lastClosed, openedAt);
    });
  }

  function closeDialog(dialogId: string, reason?: string): void {
    updateSnapshot((prev) => {
      const closing = prev.open.find((item) => item.id === dialogId);
      if (!closing) return prev;
      const next = prev.open.filter((item) => item.id !== dialogId);
      return buildDialogSnapshot(next, toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }

  function closeTopmost(reason?: string): void {
    updateSnapshot((prev) => {
      if (prev.open.length === 0) return prev;
      const closing = prev.open[prev.open.length - 1]!;
      return buildDialogSnapshot(prev.open.slice(0, -1), toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }

  function closeAll(reason?: string): void {
    updateSnapshot((prev) => {
      if (prev.open.length === 0) return prev;
      const closing = prev.open[prev.open.length - 1]!;
      return buildDialogSnapshot([], toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }

  createEffect(() => {
    if (!autoDetect) return;
    const observer = createAskableDialogObserver({ root, onChange: setDialogs });
    onCleanup(() => observer.stop());
  });

  return { ...result, snapshot, openDialog, closeDialog, closeTopmost, setDialogs, closeAll };
}
