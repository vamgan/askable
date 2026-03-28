import type { AskableEventMap, AskableEventName, AskableEventHandler } from './types.js';
export declare class Emitter {
    private handlers;
    on<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void;
    off<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void;
    emit<K extends AskableEventName>(event: K, payload: AskableEventMap[K]): void;
    clear(): void;
}
//# sourceMappingURL=emitter.d.ts.map