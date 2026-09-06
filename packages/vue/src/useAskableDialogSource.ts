import { onMounted, onUnmounted, ref, type MaybeRef } from 'vue';
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
  enabled?: MaybeRef<boolean>;
}

export interface UseAskableDialogSourceResult extends UseAskableSourceResult {
  snapshot: ReturnType<typeof ref<AskableDialogSourceSnapshot | null>>;
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
 * Vue composable that tracks which modal, drawer, or popover is open and exposes
 * it to AI assistants so they answer about the overlay in front of the user
 * instead of the page behind it.
 *
 * @example
 * ```ts
 * const { snapshot, openDialog, closeDialog } = useAskableDialogSource();
 * openDialog({ id: 'delete', title: 'Delete workspace', actions: ['Cancel', 'Delete'] });
 * ```
 *
 * @example
 * ```ts
 * // Zero-config: read open overlays straight from the DOM.
 * useAskableDialogSource({ autoDetect: true });
 * ```
 */
export function useAskableDialogSource(
  options: UseAskableDialogSourceOptions = {},
): UseAskableDialogSourceResult {
  const { id = 'dialogs', open: initialOpen = [], autoDetect = false, root, describe, kind, enabled, ctx, name, events } = options;

  const snapshot = ref<AskableDialogSourceSnapshot | null>(
    buildDialogSnapshot(initialOpen, null, initialOpen.length > 0 ? new Date().toISOString() : null),
  );

  const source = createAskableDialogSource({ describe, kind, getSnapshot: () => snapshot.value ?? null });
  const result = useAskableSource(id, source, { enabled, ctx, name, events });

  function setDialogs(entries: AskableDialogEntry[]): void {
    if (!snapshot.value) return;
    snapshot.value = buildDialogSnapshot(entries, snapshot.value.lastClosed, new Date().toISOString());
    result.notifyChanged();
  }

  function openDialog(entry: AskableDialogEntry): void {
    if (!snapshot.value) return;
    const openedAt = entry.openedAt ?? new Date().toISOString();
    const open = snapshot.value.open;
    const existing = open.findIndex((item) => item.id === entry.id);
    const next = existing >= 0
      ? open.map((item, index) => (index === existing ? { ...entry, openedAt: item.openedAt ?? openedAt } : item))
      : [...open, { ...entry, openedAt }];
    snapshot.value = buildDialogSnapshot(next, snapshot.value.lastClosed, openedAt);
    result.notifyChanged();
  }

  function closeDialog(dialogId: string, reason?: string): void {
    if (!snapshot.value) return;
    const closing = snapshot.value.open.find((item) => item.id === dialogId);
    if (!closing) return;
    const next = snapshot.value.open.filter((item) => item.id !== dialogId);
    snapshot.value = buildDialogSnapshot(next, toClosedEntry(closing, reason ?? null), new Date().toISOString());
    result.notifyChanged();
  }

  function closeTopmost(reason?: string): void {
    const open = snapshot.value?.open ?? [];
    if (open.length === 0) return;
    closeDialog(open[open.length - 1]!.id, reason);
  }

  function closeAll(reason?: string): void {
    if (!snapshot.value) return;
    const open = snapshot.value.open;
    if (open.length === 0) return;
    snapshot.value = buildDialogSnapshot([], toClosedEntry(open[open.length - 1]!, reason ?? null), new Date().toISOString());
    result.notifyChanged();
  }

  let observer: ReturnType<typeof createAskableDialogObserver> | null = null;

  onMounted(() => {
    if (autoDetect) observer = createAskableDialogObserver({ root, onChange: setDialogs });
  });

  onUnmounted(() => {
    observer?.stop();
    observer = null;
  });

  return { ...result, snapshot, openDialog, closeDialog, closeTopmost, setDialogs, closeAll };
}
