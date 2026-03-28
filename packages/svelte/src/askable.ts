import { writable, derived, readonly } from 'svelte/store';
import { createAskableContext } from '@askable-ui/core';
import type { AskableFocus, AskableContext } from '@askable-ui/core';

export interface AskableStore {
  focus: ReturnType<typeof readonly>;
  promptContext: ReturnType<typeof derived>;
  ctx: AskableContext;
  destroy: () => void;
}

export function createAskableStore() {
  const ctx = createAskableContext();
  ctx.observe(document);

  const _focus = writable<AskableFocus | null>(null);
  ctx.on('focus', (f) => _focus.set(f));

  const focus = readonly(_focus);
  const promptContext = derived(_focus, () => ctx.toPromptContext());

  function destroy() {
    ctx.destroy();
  }

  return { focus, promptContext, ctx, destroy };
}
