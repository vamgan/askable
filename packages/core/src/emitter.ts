import type { AskableEventMap, AskableEventName, AskableEventHandler } from './types.js';

type HandlerMap = {
  [K in AskableEventName]?: Set<AskableEventHandler<K>>;
};

export class Emitter {
  private handlers: HandlerMap = {};

  on<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void {
    if (!this.handlers[event]) {
      (this.handlers as Record<string, Set<unknown>>)[event] = new Set();
    }
    (this.handlers[event] as Set<AskableEventHandler<K>>).add(handler);
  }

  off<K extends AskableEventName>(event: K, handler: AskableEventHandler<K>): void {
    (this.handlers[event] as Set<AskableEventHandler<K>> | undefined)?.delete(handler);
  }

  emit<K extends AskableEventName>(event: K, payload: AskableEventMap[K]): void {
    (this.handlers[event] as Set<AskableEventHandler<K>> | undefined)?.forEach((h) =>
      h(payload)
    );
  }

  clear(): void {
    this.handlers = {};
  }
}
