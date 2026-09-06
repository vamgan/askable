import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /** Current dialog snapshot. */
  snapshot: AskableDialogSourceSnapshot | null;
  /** Push an overlay onto the stack, or update it if the id is already open. */
  openDialog: (entry: AskableDialogEntry) => void;
  /** Close an overlay by id, optionally recording why. */
  closeDialog: (id: string, reason?: string) => void;
  /** Close the overlay on top of the stack. */
  closeTopmost: (reason?: string) => void;
  /** Replace the whole stack at once. */
  setDialogs: (entries: AskableDialogEntry[]) => void;
  /** Close every open overlay. */
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
 * React hook that tracks which modal, drawer, or popover is open and exposes it
 * to AI assistants so they answer about the overlay in front of the user
 * instead of the page behind it.
 *
 * @example
 * ```tsx
 * const { snapshot, openDialog, closeDialog } = useAskableDialogSource();
 * openDialog({ id: 'delete', title: 'Delete workspace', actions: ['Cancel', 'Delete'] });
 * // AI: "The 'Delete workspace' confirmation is open and blocking the page."
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

  const [snapshot, setSnapshot] = useState<AskableDialogSourceSnapshot | null>(() =>
    buildDialogSnapshot(initialOpen, null, initialOpen.length > 0 ? new Date().toISOString() : null),
  );
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const source = useMemo(
    () => createAskableDialogSource({ describe, kind, getSnapshot: () => snapshotRef.current }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const result = useAskableSource(id, source, { enabled, ctx, name, events });
  const notifyRef = useRef(result.notifyChanged);
  notifyRef.current = result.notifyChanged;

  const updateSnapshot = useCallback(
    (updater: (prev: AskableDialogSourceSnapshot) => AskableDialogSourceSnapshot) => {
      setSnapshot((prev) => (prev ? updater(prev) : prev));
      notifyRef.current();
    },
    [],
  );

  const setDialogs = useCallback((entries: AskableDialogEntry[]) => {
    updateSnapshot((prev) => buildDialogSnapshot(entries, prev.lastClosed, new Date().toISOString()));
  }, [updateSnapshot]);

  const openDialog = useCallback((entry: AskableDialogEntry) => {
    updateSnapshot((prev) => {
      const openedAt = entry.openedAt ?? new Date().toISOString();
      const existing = prev.open.findIndex((item) => item.id === entry.id);
      const next = existing >= 0
        ? prev.open.map((item, index) => (index === existing ? { ...entry, openedAt: item.openedAt ?? openedAt } : item))
        : [...prev.open, { ...entry, openedAt }];
      return buildDialogSnapshot(next, prev.lastClosed, openedAt);
    });
  }, [updateSnapshot]);

  const closeDialog = useCallback((dialogId: string, reason?: string) => {
    updateSnapshot((prev) => {
      const closing = prev.open.find((item) => item.id === dialogId);
      if (!closing) return prev;
      const next = prev.open.filter((item) => item.id !== dialogId);
      return buildDialogSnapshot(next, toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }, [updateSnapshot]);

  const closeTopmost = useCallback((reason?: string) => {
    updateSnapshot((prev) => {
      if (prev.open.length === 0) return prev;
      const closing = prev.open[prev.open.length - 1]!;
      return buildDialogSnapshot(prev.open.slice(0, -1), toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }, [updateSnapshot]);

  const closeAll = useCallback((reason?: string) => {
    updateSnapshot((prev) => {
      if (prev.open.length === 0) return prev;
      const closing = prev.open[prev.open.length - 1]!;
      return buildDialogSnapshot([], toClosedEntry(closing, reason ?? null), new Date().toISOString());
    });
  }, [updateSnapshot]);

  const setDialogsRef = useRef(setDialogs);
  setDialogsRef.current = setDialogs;

  useEffect(() => {
    if (!autoDetect) return;
    const observer = createAskableDialogObserver({
      root,
      onChange: (entries) => setDialogsRef.current(entries),
    });
    return () => observer.stop();
  }, [autoDetect, root]);

  return { ...result, snapshot, openDialog, closeDialog, closeTopmost, setDialogs, closeAll };
}
