import { useEffect, useMemo, useState } from 'react';
import { createAskableContext } from '@askable-ui/core';
import type { AskableContext, AskableContextOptions } from '@askable-ui/core';

export interface UseAskableScreenOptions extends AskableContextOptions {
  /** Provide an existing context instead of creating a new one. */
  ctx?: AskableContext;
  /** Screen metadata to push when the screen is active. */
  meta: Record<string, unknown> | string;
  /** Optional human-readable text stored alongside the screen metadata. */
  text?: string;
  /** Whether this screen is currently active/focused. */
  active?: boolean;
  /** Whether to clear the context when the screen becomes inactive. */
  clearOnBlur?: boolean;
}

export function useAskableScreen(options: UseAskableScreenOptions): AskableContext {
  const { active = true, clearOnBlur = true, ctx, meta, text = '' } = options;
  const [screenCtx] = useState<AskableContext>(() => ctx ?? createAskableContext(options));
  const metaKey = useMemo(
    () => (typeof meta === 'string' ? meta : JSON.stringify(meta)),
    [meta]
  );

  useEffect(() => {
    if (active) {
      screenCtx.push(meta, text);
    } else if (clearOnBlur) {
      screenCtx.clear();
    }
  }, [active, clearOnBlur, metaKey, screenCtx, text]);

  useEffect(() => {
    return () => {
      if (!ctx) {
        screenCtx.destroy();
      }
    };
  }, [ctx, screenCtx]);

  return screenCtx;
}
