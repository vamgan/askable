import { $, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { QRL, SyncQRL } from '@builder.io/qwik';
import { createAskableDialogSource, createAskableDialogObserver, buildDialogSnapshot } from '@askable-ui/core';
import type {
  AskableCreateDialogSourceOptions,
  AskableDialogClosedEntry,
  AskableDialogEntry,
  AskableDialogKind,
  AskableDialogSourceSnapshot,
} from '@askable-ui/core';
import {
  useAskableSource,
  type UseAskableSourceOptions,
  type UseAskableSourceResult,
} from './useAskableSource.js';

export type { AskableDialogClosedEntry, AskableDialogEntry, AskableDialogKind, AskableDialogSourceSnapshot };

export interface UseAskableDialogSourceOptions
  extends UseAskableSourceOptions,
    Omit<AskableCreateDialogSourceOptions, 'describe' | 'getSnapshot'> {
  id?: string;
  /** Overlays already open on mount, bottom of the stack first. */
  open?: AskableDialogEntry[];
  /**
   * Detect native `<dialog>`, ARIA dialogs, and popovers from the DOM instead of
   * calling `openDialog`/`closeDialog` by hand. Manual actions are ignored while
   * this is on — the DOM is the source of truth.
   */
  autoDetect?: boolean;
  /** Resume-safe synchronous source description callback. */
  describe?: SyncQRL<NonNullable<AskableCreateDialogSourceOptions['describe']>>;
}

export interface UseAskableDialogSourceResult extends UseAskableSourceResult {
  snapshot: ReturnType<typeof useSignal<AskableDialogSourceSnapshot | null>>;
  openDialog: QRL<(entry: AskableDialogEntry) => Promise<void>>;
  closeDialog: QRL<(id: string, reason?: string) => Promise<void>>;
  closeTopmost: QRL<(reason?: string) => Promise<void>>;
  setDialogs: QRL<(entries: AskableDialogEntry[]) => Promise<void>>;
  closeAll: QRL<(reason?: string) => Promise<void>>;
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

/** Qwik hook that tracks the open dialog/overlay stack and exposes resumable actions. */
export function useAskableDialogSource(
  options: UseAskableDialogSourceOptions = {},
): UseAskableDialogSourceResult {
  const {
    id = 'dialogs',
    open: initialOpen = [],
    autoDetect = false,
    describe,
    kind,
    enabled,
    ctx,
    ctx$,
    name,
    events,
    viewport,
    textExtractor,
    sanitizeMeta,
    sanitizeText,
    sanitizeSource,
    maxHistory,
  } = options;

  const snapshot = useSignal<AskableDialogSourceSnapshot | null>(
    buildDialogSnapshot(initialOpen, null, initialOpen.length > 0 ? new Date().toISOString() : null),
  );
  const sourceFactory = $(async () => createAskableDialogSource({
    describe: await describe?.resolve(),
    kind,
    getSnapshot: () => snapshot.value,
  }));
  const result = useAskableSource(id, sourceFactory, {
    enabled, ctx, ctx$, name, events, viewport, textExtractor,
    sanitizeMeta, sanitizeText, sanitizeSource, maxHistory,
  });
  const notifyChanged = result.notifyChanged;

  const setDialogs = $(async (entries: AskableDialogEntry[]): Promise<void> => {
    const previous = snapshot.value;
    if (!previous) return;
    snapshot.value = buildDialogSnapshot(entries, previous.lastClosed, new Date().toISOString());
    await notifyChanged();
  });

  const openDialog = $(async (entry: AskableDialogEntry): Promise<void> => {
    const previous = snapshot.value;
    if (!previous) return;
    const openedAt = entry.openedAt ?? new Date().toISOString();
    const index = previous.open.findIndex((current) => current.id === entry.id);
    const open = index >= 0
      ? previous.open.map((current, currentIndex) =>
          currentIndex === index ? { ...entry, openedAt: current.openedAt ?? openedAt } : current)
      : [...previous.open, { ...entry, openedAt }];
    snapshot.value = buildDialogSnapshot(open, previous.lastClosed, openedAt);
    await notifyChanged();
  });

  const closeDialog = $(async (dialogId: string, reason?: string): Promise<void> => {
    const previous = snapshot.value;
    if (!previous) return;
    const closing = previous.open.find((current) => current.id === dialogId);
    if (!closing) return;
    snapshot.value = buildDialogSnapshot(
      previous.open.filter((current) => current.id !== dialogId),
      toClosedEntry(closing, reason ?? null),
      new Date().toISOString(),
    );
    await notifyChanged();
  });

  const closeTopmost = $(async (reason?: string): Promise<void> => {
    const previous = snapshot.value;
    if (!previous || previous.open.length === 0) return;
    const closing = previous.open[previous.open.length - 1]!;
    snapshot.value = buildDialogSnapshot(
      previous.open.slice(0, -1),
      toClosedEntry(closing, reason ?? null),
      new Date().toISOString(),
    );
    await notifyChanged();
  });

  const closeAll = $(async (reason?: string): Promise<void> => {
    const previous = snapshot.value;
    if (!previous || previous.open.length === 0) return;
    const closing = previous.open[previous.open.length - 1]!;
    snapshot.value = buildDialogSnapshot([], toClosedEntry(closing, reason ?? null), new Date().toISOString());
    await notifyChanged();
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    if (!autoDetect) return;
    const observer = createAskableDialogObserver({ onChange: (entries) => void setDialogs(entries) });
    cleanup(() => observer.stop());
  });

  return Object.assign(result, {
    snapshot,
    openDialog,
    closeDialog,
    closeTopmost,
    setDialogs,
    closeAll,
  });
}
