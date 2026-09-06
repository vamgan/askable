import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { createAskableDialogSource, createAskableDialogObserver, buildDialogSnapshot } from '@askable-ui/core';
import type {
  AskableContextSourceHandle,
  AskableCreateDialogSourceOptions,
  AskableDialogClosedEntry,
  AskableDialogEntry,
  AskableDialogKind,
  AskableDialogObserverHandle,
  AskableDialogSourceSnapshot,
  AskableResolvedContextSource,
} from '@askable-ui/core';
import { AskableService } from './askable.service.js';

export type { AskableDialogClosedEntry, AskableDialogEntry, AskableDialogKind, AskableDialogSourceSnapshot };

export interface AskableDialogSourceServiceOptions
  extends Omit<AskableCreateDialogSourceOptions, 'getSnapshot'> {
  /** Source registration id. Defaults to "dialogs". */
  id?: string;
  /** Overlays already open at init, bottom of the stack first. */
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
 * Angular service that tracks which modal, drawer, or popover is open and
 * exposes it to AI assistants so they answer about the overlay in front of the
 * user instead of the page behind it.
 *
 * @example
 * ```ts
 * \@Component({ providers: [AskableDialogSourceService] })
 * export class ShellComponent implements OnInit {
 *   private readonly dialogs = inject(AskableDialogSourceService);
 *   ngOnInit() { this.dialogs.init({ autoDetect: true }); }
 * }
 * ```
 */
@Injectable()
export class AskableDialogSourceService implements OnDestroy {
  private readonly askable = inject(AskableService);
  private handle: AskableContextSourceHandle | null = null;
  private observer: AskableDialogObserverHandle | null = null;
  private _sourceId = 'dialogs';
  private _snapshot: AskableDialogSourceSnapshot | null = null;

  readonly isRegistered = signal<boolean>(false);

  get snapshot(): AskableDialogSourceSnapshot | null { return this._snapshot; }
  get sourceId(): string { return this._sourceId; }

  init(options: AskableDialogSourceServiceOptions = {}): void {
    this.unregister();
    const { id = 'dialogs', open = [], autoDetect = false, root, describe, kind } = options;
    this._sourceId = id;
    this._snapshot = buildDialogSnapshot(open, null, open.length > 0 ? new Date().toISOString() : null);

    const source = createAskableDialogSource({ describe, kind, getSnapshot: () => this._snapshot });
    this.handle = this.askable.context.registerSource(id, source);
    this.isRegistered.set(true);

    if (autoDetect) {
      this.observer = createAskableDialogObserver({ root, onChange: (entries) => this.setDialogs(entries) });
    }
  }

  setDialogs(entries: AskableDialogEntry[]): void {
    if (!this._snapshot) return;
    this._snapshot = buildDialogSnapshot(entries, this._snapshot.lastClosed, new Date().toISOString());
    this.notifyChanged();
  }

  openDialog(entry: AskableDialogEntry): void {
    if (!this._snapshot) return;
    const openedAt = entry.openedAt ?? new Date().toISOString();
    const open = this._snapshot.open;
    const existing = open.findIndex((item) => item.id === entry.id);
    const next = existing >= 0
      ? open.map((item, index) => (index === existing ? { ...entry, openedAt: item.openedAt ?? openedAt } : item))
      : [...open, { ...entry, openedAt }];
    this._snapshot = buildDialogSnapshot(next, this._snapshot.lastClosed, openedAt);
    this.notifyChanged();
  }

  closeDialog(id: string, reason?: string): void {
    if (!this._snapshot) return;
    const closing = this._snapshot.open.find((item) => item.id === id);
    if (!closing) return;
    const next = this._snapshot.open.filter((item) => item.id !== id);
    this._snapshot = buildDialogSnapshot(next, toClosedEntry(closing, reason ?? null), new Date().toISOString());
    this.notifyChanged();
  }

  closeTopmost(reason?: string): void {
    const open = this._snapshot?.open ?? [];
    if (open.length === 0) return;
    this.closeDialog(open[open.length - 1]!.id, reason);
  }

  closeAll(reason?: string): void {
    if (!this._snapshot || this._snapshot.open.length === 0) return;
    const closing = this._snapshot.open[this._snapshot.open.length - 1]!;
    this._snapshot = buildDialogSnapshot([], toClosedEntry(closing, reason ?? null), new Date().toISOString());
    this.notifyChanged();
  }

  resolve(request?: { mode?: string }): Promise<AskableResolvedContextSource> {
    return this.askable.context.resolveSource(this._sourceId, request);
  }

  async toPromptContext(options?: { mode?: string; maxTokens?: number }): Promise<string> {
    return this.askable.context.toPromptContextAsync({ sources: [{ id: this._sourceId, ...options }] });
  }

  notifyChanged(): void { this.handle?.notifyChanged(); }

  unregister(): void {
    this.observer?.stop();
    this.observer = null;
    this.handle?.unregister();
    this.handle = null;
    this.isRegistered.set(false);
  }

  ngOnDestroy(): void { this.unregister(); }
}
