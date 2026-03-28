import type { AskableFocus, AskableContext } from '@askable/core';
export interface UseAskableResult {
    focus: AskableFocus | null;
    promptContext: string;
    ctx: AskableContext;
}
export declare function useAskable(): UseAskableResult;
//# sourceMappingURL=useAskable.d.ts.map