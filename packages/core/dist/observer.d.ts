import type { AskableFocus, AskableEvent } from './types.js';
type FocusCallback = (focus: AskableFocus) => void;
export declare function buildFocus(el: HTMLElement): AskableFocus | null;
export declare class Observer {
    private root;
    private mutationObserver;
    private boundElements;
    private onFocus;
    private activeEvents;
    private hoverDebounce;
    private hoverTimer;
    constructor(onFocus: FocusCallback);
    observe(root: HTMLElement | Document, events?: AskableEvent[], hoverDebounce?: number): void;
    unobserve(): void;
    private handleInteraction;
    private attach;
    private detach;
}
export {};
//# sourceMappingURL=observer.d.ts.map