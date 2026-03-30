import type { AskableEvent, AskableFocus, AskableContext } from '@askable-ui/core';
export interface UseAskableResult {
    focus: AskableFocus | null;
    promptContext: string;
    ctx: AskableContext;
}
export declare function useAskable(options?: {
    events?: AskableEvent[];
}): UseAskableResult;
//# sourceMappingURL=useAskable.d.ts.map