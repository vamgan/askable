import { useState, useEffect, useRef } from 'react';
import { createAskableContext } from '@askable/core';
import type { AskableFocus, AskableContext } from '@askable/core';

let globalCtx: AskableContext | null = null;
let refCount = 0;

function getGlobalCtx(): AskableContext {
  if (!globalCtx) {
    globalCtx = createAskableContext();
    globalCtx.observe(document);
  }
  return globalCtx;
}

export interface UseAskableResult {
  focus: AskableFocus | null;
  promptContext: string;
  ctx: AskableContext;
}

export function useAskable(): UseAskableResult {
  const ctx = useRef<AskableContext>(getGlobalCtx());
  const [focus, setFocus] = useState<AskableFocus | null>(() => ctx.current.getFocus());

  useEffect(() => {
    refCount++;
    const current = ctx.current;

    const handler = (f: AskableFocus) => setFocus(f);
    current.on('focus', handler);

    return () => {
      current.off('focus', handler);
      refCount--;
      if (refCount === 0) {
        globalCtx?.destroy();
        globalCtx = null;
      }
    };
  }, []);

  return {
    focus,
    promptContext: ctx.current.toPromptContext(),
    ctx: ctx.current,
  };
}
