import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useAskable } from '../useAskable';

function Consumer({ targetId }: { targetId?: string }) {
  const { focus, promptContext } = useAskable();
  return (
    <div>
      {targetId && (
        <div
          id={targetId}
          data-testid="askable-target"
          data-askable='{"metric":"revenue","period":"Q3","value":"$2.3M"}'
        >
          Revenue: $2.3M
        </div>
      )}
      <span data-testid="focus-meta">
        {focus ? JSON.stringify(focus.meta) : 'null'}
      </span>
      <span data-testid="focus-text">{focus ? focus.text : ''}</span>
      <span data-testid="prompt-context">{promptContext}</span>
    </div>
  );
}

/** Flush pending microtasks (including MutationObserver callbacks). */
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useAskable', () => {
  it('returns null focus initially', () => {
    render(<Consumer />);
    expect(screen.getByTestId('focus-meta').textContent).toBe('null');
  });

  it('returns the no-focus prompt string initially', () => {
    render(<Consumer />);
    expect(screen.getByTestId('prompt-context').textContent).toBe(
      'No UI element is currently focused.'
    );
  });

  it('updates focus after a click on a [data-askable] element', async () => {
    render(<Consumer targetId="revenue-chart" />);

    // Let MutationObserver fire so the element's click listener is attached
    await flushMicrotasks();

    expect(screen.getByTestId('focus-meta').textContent).toBe('null');

    act(() => {
      fireEvent.click(screen.getByTestId('askable-target'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('focus-meta').textContent).not.toBe('null');
    });

    const meta = JSON.parse(screen.getByTestId('focus-meta').textContent!);
    expect(meta).toEqual({ metric: 'revenue', period: 'Q3', value: '$2.3M' });
  });

  it('populates focus.text from element textContent after click', async () => {
    render(<Consumer targetId="revenue-text" />);
    await flushMicrotasks();

    act(() => {
      fireEvent.click(screen.getByTestId('askable-target'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('focus-text').textContent).not.toBe('');
    });

    expect(screen.getByTestId('focus-text').textContent).toContain('Revenue');
  });

  it('returns a non-empty promptContext string after focus', async () => {
    render(<Consumer targetId="prompt-test" />);
    await flushMicrotasks();

    act(() => {
      fireEvent.click(screen.getByTestId('askable-target'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('prompt-context').textContent).not.toBe(
        'No UI element is currently focused.'
      );
    });

    const prompt = screen.getByTestId('prompt-context').textContent!;
    expect(prompt).toContain('User is focused on');
    expect(prompt).toContain('revenue');
  });
});
