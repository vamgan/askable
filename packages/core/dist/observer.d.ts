import type { AskableFocus } from './types.js';
type FocusCallback = (focus: AskableFocus) => void;
export declare class Observer {
    private root;
    private mutationObserver;
    private boundElements;
    private onFocus;
    constructor(onFocus: FocusCallback);
    observe(root: HTMLElement | Document): void;
    unobserve(): void;
    private handleInteraction;
    private attach;
    private detach;
}
export {};
//# sourceMappingURL=observer.d.ts.map