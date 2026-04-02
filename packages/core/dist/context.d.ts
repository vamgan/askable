import type { AskableContext, AskableEventHandler, AskableEventName, AskableFocus, AskableObserveOptions, AskablePromptContextOptions, AskableSerializedFocus } from './types.js';
export declare class AskableContextImpl implements AskableContext {
    private emitter;
    private observer;
    private currentFocus;
    private history;
    constructor();
    observe(root: HTMLElement | Document, options?: AskableObserveOptions): void;
    unobserve(): void;
    getFocus(): AskableFocus | null;
    getHistory(limit?: number): AskableFocus[];
    on<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void;
    off<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void;
    select(element: HTMLElement): void;
    clear(): void;
    serializeFocus(options?: AskablePromptContextOptions): AskableSerializedFocus | null;
    toPromptContext(options?: AskablePromptContextOptions): string;
    destroy(): void;
    private normalizeMeta;
    private normalizeText;
}
//# sourceMappingURL=context.d.ts.map