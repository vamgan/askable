import { render, act } from '@testing-library/react';
import { createAskableContext } from '@askable-ui/core';
import { useAskableDialogSource } from '../useAskableDialogSource.js';
import type { UseAskableDialogSourceResult } from '../useAskableDialogSource.js';

let hookRef: UseAskableDialogSourceResult | undefined;

function DialogConsumer({
  ctx,
  ...rest
}: Parameters<typeof useAskableDialogSource>[0] & {
  ctx: ReturnType<typeof createAskableContext>;
}) {
  hookRef = useAskableDialogSource({ ctx, ...rest });
  return null;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('useAskableDialogSource', () => {
  afterEach(() => {
    hookRef = undefined;
    document.body.innerHTML = '';
  });

  it('registers under "dialogs" id by default', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    expect(ctx.hasSource('dialogs')).toBe(true);
    expect(hookRef!.sourceId).toBe('dialogs');
    ctx.destroy();
  });

  it('starts with an empty stack', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    expect(hookRef!.snapshot?.hasOpenDialog).toBe(false);
    expect(hookRef!.snapshot?.openCount).toBe(0);
    ctx.destroy();
  });

  it('accepts overlays that are already open', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'checkout', title: 'Checkout' }]} />);

    expect(hookRef!.snapshot?.topmost?.title).toBe('Checkout');
    expect(hookRef!.snapshot?.isBlocking).toBe(true);
    ctx.destroy();
  });

  it('opens and stacks overlays', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    act(() => hookRef!.openDialog({ id: 'filters', title: 'Filters', kind: 'drawer' }));
    act(() => hookRef!.openDialog({ id: 'confirm', title: 'Delete workspace' }));

    expect(hookRef!.snapshot?.open.map((entry) => entry.id)).toEqual(['filters', 'confirm']);
    expect(hookRef!.snapshot?.topmost?.id).toBe('confirm');
    expect(hookRef!.snapshot?.isDestructive).toBe(true);
    ctx.destroy();
  });

  it('stamps openedAt and keeps it when the overlay is updated', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    act(() => hookRef!.openDialog({ id: 'filters', title: 'Filters' }));
    const openedAt = hookRef!.snapshot?.topmost?.openedAt;
    expect(openedAt).toBeTruthy();

    act(() => hookRef!.openDialog({ id: 'filters', title: 'Filters (2 applied)' }));
    expect(hookRef!.snapshot?.openCount).toBe(1);
    expect(hookRef!.snapshot?.topmost?.title).toBe('Filters (2 applied)');
    expect(hookRef!.snapshot?.topmost?.openedAt).toBe(openedAt);
    ctx.destroy();
  });

  it('closes an overlay by id and records why', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    act(() => hookRef!.openDialog({ id: 'confirm', title: 'Delete workspace' }));
    act(() => hookRef!.closeDialog('confirm', 'cancel'));

    expect(hookRef!.snapshot?.hasOpenDialog).toBe(false);
    expect(hookRef!.snapshot?.lastClosed).toMatchObject({ id: 'confirm', reason: 'cancel' });
    ctx.destroy();
  });

  it('ignores closing an overlay that is not open', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'a' }]} />);

    act(() => hookRef!.closeDialog('missing'));
    expect(hookRef!.snapshot?.openCount).toBe(1);
    expect(hookRef!.snapshot?.lastClosed).toBeNull();
    ctx.destroy();
  });

  it('closes only the topmost overlay', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'a' }, { id: 'b' }]} />);

    act(() => hookRef!.closeTopmost('escape'));

    expect(hookRef!.snapshot?.open.map((entry) => entry.id)).toEqual(['a']);
    expect(hookRef!.snapshot?.lastClosed).toMatchObject({ id: 'b', reason: 'escape' });
    ctx.destroy();
  });

  it('closes the whole stack', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'a' }, { id: 'b' }]} />);

    act(() => hookRef!.closeAll('route-change'));

    expect(hookRef!.snapshot?.openCount).toBe(0);
    expect(hookRef!.snapshot?.lastClosed).toMatchObject({ id: 'b', reason: 'route-change' });
    ctx.destroy();
  });

  it('replaces the stack with setDialogs', () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'a' }]} />);

    act(() => hookRef!.setDialogs([{ id: 'b', kind: 'popover' }]));

    expect(hookRef!.snapshot?.open.map((entry) => entry.id)).toEqual(['b']);
    expect(hookRef!.snapshot?.isBlocking).toBe(false);
    ctx.destroy();
  });

  it('resolves the snapshot as source data', async () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} open={[{ id: 'confirm', title: 'Delete workspace' }]} />);

    const resolved = await hookRef!.resolve();
    const data = resolved.data as { openCount: number; isDestructive: boolean };
    expect(data.openCount).toBe(1);
    expect(data.isDestructive).toBe(true);
    expect(await hookRef!.toPromptContext()).toContain('Delete workspace');
    ctx.destroy();
  });

  it('detects overlays from the DOM when autoDetect is on', async () => {
    const ctx = createAskableContext();
    document.body.innerHTML = '<div role="dialog" id="native"><h2>Invite teammates</h2></div>';

    render(<DialogConsumer ctx={ctx} autoDetect />);
    await act(flush);

    expect(hookRef!.snapshot?.topmost?.id).toBe('native');
    expect(hookRef!.snapshot?.topmost?.title).toBe('Invite teammates');
    ctx.destroy();
  });

  it('follows DOM changes while autoDetect is on', async () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} autoDetect />);

    await act(async () => {
      document.body.innerHTML = '<dialog open id="confirm"><h2>Delete</h2></dialog>';
      await flush();
    });
    expect(hookRef!.snapshot?.openCount).toBe(1);

    await act(async () => {
      document.body.innerHTML = '';
      await flush();
    });
    expect(hookRef!.snapshot?.openCount).toBe(0);
    ctx.destroy();
  });

  it('does not observe the DOM when autoDetect is off', async () => {
    const ctx = createAskableContext();
    render(<DialogConsumer ctx={ctx} />);

    await act(async () => {
      document.body.innerHTML = '<div role="dialog" id="ignored"><h2>Ignored</h2></div>';
      await flush();
    });

    expect(hookRef!.snapshot?.openCount).toBe(0);
    ctx.destroy();
  });

  it('stops observing on unmount', async () => {
    const ctx = createAskableContext();
    const { unmount } = render(<DialogConsumer ctx={ctx} autoDetect />);
    const captured = hookRef!;
    unmount();

    await act(async () => {
      document.body.innerHTML = '<div role="dialog" id="late"><h2>Late</h2></div>';
      await flush();
    });

    expect(captured.snapshot?.openCount).toBe(0);
    ctx.destroy();
  });

  it('unregisters the source on unmount', () => {
    const ctx = createAskableContext();
    const { unmount } = render(<DialogConsumer ctx={ctx} />);
    expect(ctx.hasSource('dialogs')).toBe(true);

    unmount();
    expect(ctx.hasSource('dialogs')).toBe(false);
    ctx.destroy();
  });
});
