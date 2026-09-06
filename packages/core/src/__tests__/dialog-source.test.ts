import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildDialogSnapshot,
  collectAskableDialogs,
  createAskableDialogObserver,
  createAskableDialogSource,
} from '../dialog-source.js';
import { createAskableContext } from '../index.js';
import type { AskableDialogEntry } from '../dialog-source.js';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const confirmDelete: AskableDialogEntry = {
  id: 'delete-workspace',
  title: 'Delete workspace',
  kind: 'alertdialog',
  description: 'This removes every project in the workspace.',
  actions: ['Cancel', 'Delete workspace'],
};

const filterDrawer: AskableDialogEntry = {
  id: 'filters',
  title: 'Filters',
  kind: 'drawer',
};

describe('buildDialogSnapshot', () => {
  it('reports an empty stack when nothing is open', () => {
    const snap = buildDialogSnapshot([]);
    expect(snap.hasOpenDialog).toBe(false);
    expect(snap.openCount).toBe(0);
    expect(snap.topmost).toBeNull();
    expect(snap.isBlocking).toBe(false);
    expect(snap.isDestructive).toBe(false);
  });

  it('treats the last entry as the topmost overlay', () => {
    const snap = buildDialogSnapshot([filterDrawer, confirmDelete]);
    expect(snap.openCount).toBe(2);
    expect(snap.topmost?.id).toBe('delete-workspace');
  });

  it('defaults kind to dialog and modal to true', () => {
    const snap = buildDialogSnapshot([{ id: 'plain' }]);
    expect(snap.topmost?.kind).toBe('dialog');
    expect(snap.topmost?.modal).toBe(true);
    expect(snap.isBlocking).toBe(true);
  });

  it('treats popovers, menus, and tooltips as non-blocking by default', () => {
    for (const kind of ['popover', 'menu', 'tooltip']) {
      const snap = buildDialogSnapshot([{ id: kind, kind }]);
      expect(snap.topmost?.modal).toBe(false);
      expect(snap.isBlocking).toBe(false);
    }
  });

  it('honours an explicit modal flag', () => {
    const snap = buildDialogSnapshot([{ id: 'menu', kind: 'menu', modal: true }]);
    expect(snap.isBlocking).toBe(true);
  });

  it('blocks when any entry in the stack is modal', () => {
    const snap = buildDialogSnapshot([confirmDelete, { id: 'tip', kind: 'tooltip' }]);
    expect(snap.isBlocking).toBe(true);
  });

  it('infers destructive intent from action labels', () => {
    const snap = buildDialogSnapshot([confirmDelete]);
    expect(snap.topmost?.destructive).toBe(true);
    expect(snap.isDestructive).toBe(true);
  });

  it('infers destructive intent from the title', () => {
    const snap = buildDialogSnapshot([{ id: 'revoke', title: 'Revoke API key' }]);
    expect(snap.isDestructive).toBe(true);
  });

  it('does not mark ordinary dialogs destructive', () => {
    const snap = buildDialogSnapshot([{ id: 'edit', title: 'Edit profile', actions: ['Cancel', 'Save'] }]);
    expect(snap.isDestructive).toBe(false);
  });

  it('honours an explicit destructive flag over the heuristic', () => {
    const snap = buildDialogSnapshot([{ id: 'edit', title: 'Delete draft', destructive: false }]);
    expect(snap.isDestructive).toBe(false);
  });

  it('only reports the topmost overlay as destructive', () => {
    const snap = buildDialogSnapshot([confirmDelete, filterDrawer]);
    expect(snap.isDestructive).toBe(false);
    expect(snap.open[0]?.destructive).toBe(true);
  });

  it('stores lastClosed and lastChangedAt', () => {
    const ts = new Date().toISOString();
    const snap = buildDialogSnapshot(
      [],
      { id: 'filters', title: 'Filters', kind: 'drawer', reason: 'escape', closedAt: ts },
      ts,
    );
    expect(snap.lastClosed?.reason).toBe('escape');
    expect(snap.lastChangedAt).toBe(ts);
  });

  it('does not mutate the entries it is given', () => {
    const entry: AskableDialogEntry = { id: 'plain' };
    buildDialogSnapshot([entry]);
    expect(entry.kind).toBeUndefined();
    expect(entry.modal).toBeUndefined();
  });
});

describe('createAskableDialogSource', () => {
  it('registers with kind "dialog"', () => {
    const source = createAskableDialogSource({ getSnapshot: () => buildDialogSnapshot([]) });
    expect(source.kind).toBe('dialog');
  });

  it('describes an empty stack', () => {
    const source = createAskableDialogSource({ getSnapshot: () => buildDialogSnapshot([]) });
    expect(source.describe?.()).toBe('No dialog, drawer, or popover is open.');
  });

  it('describes the last closed overlay when nothing is open', () => {
    const source = createAskableDialogSource({
      getSnapshot: () =>
        buildDialogSnapshot([], { id: 'filters', title: 'Filters', kind: 'drawer', reason: 'cancel', closedAt: null }),
    });
    expect(source.describe?.()).toContain('Last closed: "Filters" (cancel)');
  });

  it('describes a single open dialog with its actions', () => {
    const source = createAskableDialogSource({ getSnapshot: () => buildDialogSnapshot([confirmDelete]) });
    const desc = source.describe?.() ?? '';
    expect(desc).toContain('alertdialog "Delete workspace"');
    expect(desc).toContain('Actions: Cancel, Delete workspace.');
    expect(desc).toContain('blocked');
    expect(desc).toContain('destructive action');
  });

  it('describes a stacked overlay list', () => {
    const source = createAskableDialogSource({
      getSnapshot: () => buildDialogSnapshot([filterDrawer, confirmDelete]),
    });
    const desc = source.describe?.() ?? '';
    expect(desc).toContain('2 overlays are stacked');
    expect(desc).toContain('Topmost: "Delete workspace"');
  });

  it('reports unavailable state when the snapshot is null', () => {
    const source = createAskableDialogSource({ getSnapshot: () => null });
    expect(source.describe?.()).toContain('unavailable');
  });

  it('respects a custom describe function and kind', () => {
    const source = createAskableDialogSource({
      kind: 'overlay',
      describe: (snapshot) => `open=${snapshot?.openCount ?? 0}`,
      getSnapshot: () => buildDialogSnapshot([confirmDelete]),
    });
    expect(source.kind).toBe('overlay');
    expect(source.describe?.()).toBe('open=1');
  });

  it('exposes stack state and snapshot data when resolved', async () => {
    const ctx = createAskableContext();
    ctx.registerSource('dialogs', createAskableDialogSource({ getSnapshot: () => buildDialogSnapshot([confirmDelete]) }));
    const resolved = await ctx.resolveSource('dialogs');
    expect(resolved.state).toMatchObject({
      hasOpenDialog: true,
      openCount: 1,
      isBlocking: true,
      isDestructive: true,
      topmostId: 'delete-workspace',
      topmostTitle: 'Delete workspace',
    });
    expect(resolved.data).toMatchObject({ openCount: 1 });
    ctx.destroy();
  });

  it('returns null data when the snapshot is null', async () => {
    const ctx = createAskableContext();
    ctx.registerSource('dialogs', createAskableDialogSource({ getSnapshot: () => null }));
    const resolved = await ctx.resolveSource('dialogs');
    expect(resolved.data).toBeNull();
    ctx.destroy();
  });

  it('registers with a context and reaches the prompt', async () => {
    const ctx = createAskableContext();
    ctx.registerSource('dialogs', createAskableDialogSource({ getSnapshot: () => buildDialogSnapshot([confirmDelete]) }));
    const prompt = await ctx.toPromptContextAsync({ sources: [{ id: 'dialogs' }] });
    expect(prompt).toContain('Delete workspace');
    ctx.destroy();
  });
});

describe('collectAskableDialogs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns nothing when no overlay is open', () => {
    document.body.innerHTML = '<div><p>Just a page</p></div>';
    expect(collectAskableDialogs(document)).toEqual([]);
  });

  it('detects an open native dialog and reads its heading and buttons', () => {
    document.body.innerHTML = `
      <dialog open id="confirm">
        <h2>Delete workspace</h2>
        <button>Cancel</button>
        <button>Delete</button>
      </dialog>`;
    const [entry] = collectAskableDialogs(document);
    expect(entry?.id).toBe('confirm');
    expect(entry?.title).toBe('Delete workspace');
    expect(entry?.kind).toBe('dialog');
    expect(entry?.actions).toEqual(['Cancel', 'Delete']);
  });

  it('ignores a closed native dialog', () => {
    document.body.innerHTML = '<dialog id="confirm"><h2>Delete</h2></dialog>';
    expect(collectAskableDialogs(document)).toEqual([]);
  });

  it('ignores a closed native dialog that also declares role and aria-modal', () => {
    document.body.innerHTML = '<dialog id="confirm" role="dialog" aria-modal="true"><h2>Delete</h2></dialog>';
    expect(collectAskableDialogs(document)).toEqual([]);
  });

  it('detects ARIA dialogs and reads aria-label and aria-describedby', () => {
    document.body.innerHTML = `
      <div role="alertdialog" id="alert" aria-label="Session expiring" aria-describedby="why">
        <p id="why">You will be signed out in one minute.</p>
      </div>`;
    const [entry] = collectAskableDialogs(document);
    expect(entry?.kind).toBe('alertdialog');
    expect(entry?.title).toBe('Session expiring');
    expect(entry?.description).toBe('You will be signed out in one minute.');
  });

  it('reads titles from aria-labelledby', () => {
    document.body.innerHTML = `
      <div role="dialog" id="d" aria-labelledby="t"><h3 id="t">Invite teammates</h3></div>`;
    expect(collectAskableDialogs(document)[0]?.title).toBe('Invite teammates');
  });

  it('marks aria-modal containers as modal', () => {
    document.body.innerHTML = '<div role="dialog" id="d" aria-modal="true"><h2>Checkout</h2></div>';
    expect(collectAskableDialogs(document)[0]?.modal).toBe(true);
  });

  it('treats aria-modal="false" dialogs as non-blocking', () => {
    document.body.innerHTML = '<div role="dialog" id="d" aria-modal="false"><h2>Notes</h2></div>';
    expect(collectAskableDialogs(document)[0]?.modal).toBe(false);
  });

  it('skips hidden and aria-hidden overlays', () => {
    document.body.innerHTML = `
      <div role="dialog" id="a" hidden><h2>Hidden</h2></div>
      <div role="dialog" id="b" aria-hidden="true"><h2>Aria hidden</h2></div>
      <div role="dialog" id="c" style="display: none"><h2>Display none</h2></div>`;
    expect(collectAskableDialogs(document)).toEqual([]);
  });

  it('honours data-askable-dialog-* overrides', () => {
    document.body.innerHTML = `
      <div role="dialog" id="raw"
           data-askable-dialog-id="checkout"
           data-askable-dialog-title="Checkout"
           data-askable-dialog-kind="sheet">
        <h2>Ignore me</h2>
      </div>`;
    const [entry] = collectAskableDialogs(document);
    expect(entry?.id).toBe('checkout');
    expect(entry?.title).toBe('Checkout');
    expect(entry?.kind).toBe('sheet');
  });

  it('falls back to a positional id when the element has none', () => {
    document.body.innerHTML = '<div role="dialog"><h2>Anonymous</h2></div>';
    expect(collectAskableDialogs(document)[0]?.id).toBe('dialog-1');
  });

  it('returns overlays in document order, topmost last', () => {
    document.body.innerHTML = `
      <div role="dialog" id="first"><h2>First</h2></div>
      <div role="dialog" id="second"><h2>Second</h2></div>`;
    expect(collectAskableDialogs(document).map((entry) => entry.id)).toEqual(['first', 'second']);
  });

  it('caps the number of collected action labels', () => {
    const buttons = Array.from({ length: 12 }, (_, i) => `<button>Action ${i}</button>`).join('');
    document.body.innerHTML = `<div role="dialog" id="d"><h2>Many</h2>${buttons}</div>`;
    expect(collectAskableDialogs(document)[0]?.actions).toHaveLength(8);
  });

  it('returns an empty list for a missing root', () => {
    expect(collectAskableDialogs(null)).toEqual([]);
  });
});

describe('createAskableDialogObserver', () => {
  let observer: ReturnType<typeof createAskableDialogObserver> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    observer?.stop();
    observer = null;
  });

  it('reports the initial stack synchronously', () => {
    document.body.innerHTML = '<div role="dialog" id="d"><h2>Open</h2></div>';
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ onChange });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0][0].id).toBe('d');
  });

  it('does not fire when nothing is open', () => {
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ onChange });
    expect(onChange).not.toHaveBeenCalled();
    expect(observer.getEntries()).toEqual([]);
  });

  it('reports overlays that open and close', async () => {
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ onChange });

    document.body.innerHTML = '<div role="dialog" id="d"><h2>Opened</h2></div>';
    await flush();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'd' })]);

    document.body.innerHTML = '';
    await flush();
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('keeps openedAt stable while an overlay stays open', () => {
    document.body.innerHTML = '<div role="dialog" id="d"><h2>Open</h2></div>';
    observer = createAskableDialogObserver({ onChange: () => {} });
    const first = observer.getEntries()[0]?.openedAt;
    expect(first).toBeTruthy();

    document.querySelector('#d')!.setAttribute('aria-label', 'Renamed');
    observer.refresh();
    expect(observer.getEntries()[0]?.openedAt).toBe(first);
    expect(observer.getEntries()[0]?.title).toBe('Renamed');
  });

  it('ignores DOM changes that do not affect the overlay stack', async () => {
    document.body.innerHTML = '<div role="dialog" id="d"><h2>Open</h2></div>';
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ onChange });
    onChange.mockClear();

    document.body.appendChild(document.createElement('p'));
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops reporting after stop()', async () => {
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ onChange });
    observer.stop();

    document.body.innerHTML = '<div role="dialog" id="d"><h2>Opened</h2></div>';
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('scopes scanning to the given root', async () => {
    document.body.innerHTML = '<div id="scope"></div><div role="dialog" id="outside"><h2>Outside</h2></div>';
    const scope = document.getElementById('scope')!;
    const onChange = vi.fn();
    observer = createAskableDialogObserver({ root: scope, onChange });
    expect(onChange).not.toHaveBeenCalled();

    scope.innerHTML = '<div role="dialog" id="inside"><h2>Inside</h2></div>';
    await flush();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'inside' })]);
  });
});
