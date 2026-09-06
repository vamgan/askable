import { onMount, onDestroy } from 'svelte';
import { createAskableDialogSource, createAskableDialogObserver, buildDialogSnapshot } from '@askable-ui/core';
import type {
  AskableCreateDialogSourceOptions,
  AskableDialogClosedEntry,
  AskableDialogEntry,
  AskableDialogKind,
  AskableDialogObserverHandle,
  AskableDialogSourceSnapshot,
} from '@askable-ui/core';
import { useAskableSource, type UseAskableSource, type UseAskableSourceOptions } from './useAskableSource.svelte.js';

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

export interface UseAskableDialogSource extends UseAskableSource {
  readonly snapshot: AskableDialogSourceSnapshot | null;
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
 * Svelte 5 runes-based composable that tracks which modal, drawer, or popover is
 * open and exposes it to AI assistants so they answer about the overlay in front
 * of the user instead of the page behind it.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useAskableDialogSource } from '@askable-ui/svelte/useAskableDialogSource.svelte';
 *   const dialogs = useAskableDialogSource({ autoDetect: true });
 * </script>
 * ```
 */
export function useAskableDialogSource(
  options: UseAskableDialogSourceOptions = {},
): UseAskableDialogSource {
  const { id = 'dialogs', open: initialOpen = [], autoDetect = false, root, describe, kind, observe, enabled, ...ctxOptions } = options;

  let snapshot = $state<AskableDialogSourceSnapshot | null>(
    buildDialogSnapshot(initialOpen, null, initialOpen.length > 0 ? new Date().toISOString() : null),
  );

  const dialogSource = createAskableDialogSource({ describe, kind, getSnapshot: () => snapshot });
  const result = useAskableSource(id, { ...dialogSource, ...ctxOptions, observe, enabled });

  function setDialogs(entries: AskableDialogEntry[]): void {
    if (!snapshot) return;
    snapshot = buildDialogSnapshot(entries, snapshot.lastClosed, new Date().toISOString());
    result.notifyChanged();
  }

  function openDialog(entry: AskableDialogEntry): void {
    if (!snapshot) return;
    const openedAt = entry.openedAt ?? new Date().toISOString();
    const existing = snapshot.open.findIndex((item) => item.id === entry.id);
    const next = existing >= 0
      ? snapshot.open.map((item, index) => (index === existing ? { ...entry, openedAt: item.openedAt ?? openedAt } : item))
      : [...snapshot.open, { ...entry, openedAt }];
    snapshot = buildDialogSnapshot(next, snapshot.lastClosed, openedAt);
    result.notifyChanged();
  }

  function closeDialog(dialogId: string, reason?: string): void {
    if (!snapshot) return;
    const closing = snapshot.open.find((item) => item.id === dialogId);
    if (!closing) return;
    const next = snapshot.open.filter((item) => item.id !== dialogId);
    snapshot = buildDialogSnapshot(next, toClosedEntry(closing, reason ?? null), new Date().toISOString());
    result.notifyChanged();
  }

  function closeTopmost(reason?: string): void {
    const open = snapshot?.open ?? [];
    if (open.length === 0) return;
    closeDialog(open[open.length - 1]!.id, reason);
  }

  function closeAll(reason?: string): void {
    if (!snapshot || snapshot.open.length === 0) return;
    const closing = snapshot.open[snapshot.open.length - 1]!;
    snapshot = buildDialogSnapshot([], toClosedEntry(closing, reason ?? null), new Date().toISOString());
    result.notifyChanged();
  }

  let observer: AskableDialogObserverHandle | null = null;

  onMount(() => {
    if (autoDetect) observer = createAskableDialogObserver({ root, onChange: setDialogs });
  });

  onDestroy(() => {
    observer?.stop();
    observer = null;
  });

  return {
    ...result,
    openDialog,
    closeDialog,
    closeTopmost,
    setDialogs,
    closeAll,
    get snapshot() { return snapshot; },
  };
}
