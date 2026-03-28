import type { AskableFocus, AskableContext } from '@askable-ui/core';
export interface UseAskableResult {
    focus: AskableFocus | null;
    promptContext: string;
    ctx: AskableContext;
}
export declare function useAskable(): UseAskableResult;
//# sourceMappingURL=useAskable.d.ts.map