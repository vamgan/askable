import { Emitter } from './emitter.js';
import { buildFocus, Observer } from './observer.js';
const MAX_HISTORY = 50;
export class AskableContextImpl {
    constructor() {
        this.emitter = new Emitter();
        this.currentFocus = null;
        this.history = [];
        this.observer = new Observer((focus) => {
            this.currentFocus = focus;
            this.history.push(focus);
            if (this.history.length > MAX_HISTORY)
                this.history.shift();
            this.emitter.emit('focus', focus);
        });
    }
    observe(root, options) {
        this.observer.observe(root, options?.events, options?.hoverDebounce ?? 0);
    }
    unobserve() {
        this.observer.unobserve();
    }
    getFocus() {
        return this.currentFocus;
    }
    getHistory(limit) {
        const hist = this.history.slice().reverse();
        return limit !== undefined ? hist.slice(0, limit) : hist;
    }
    on(event, handler) {
        this.emitter.on(event, handler);
    }
    off(event, handler) {
        this.emitter.off(event, handler);
    }
    select(element) {
        const focus = buildFocus(element);
        if (focus) {
            this.currentFocus = focus;
            this.history.push(focus);
            if (this.history.length > MAX_HISTORY)
                this.history.shift();
            this.emitter.emit('focus', focus);
        }
    }
    clear() {
        this.currentFocus = null;
        this.emitter.emit('clear', null);
    }
    serializeFocus(options) {
        const focus = this.currentFocus;
        if (!focus)
            return null;
        const includeText = options?.includeText ?? true;
        const maxTextLength = options?.maxTextLength;
        const meta = typeof focus.meta === 'string'
            ? focus.meta
            : this.normalizeMeta(focus.meta, options);
        const text = includeText ? this.normalizeText(focus.text, maxTextLength) : '';
        return {
            meta,
            ...(text ? { text } : {}),
            timestamp: focus.timestamp,
        };
    }
    toPromptContext(options) {
        const format = options?.format ?? 'natural';
        const serialized = this.serializeFocus(options);
        if (!serialized)
            return format === 'json' ? 'null' : 'No UI element is currently focused.';
        if (format === 'json') {
            return JSON.stringify(serialized);
        }
        const textLabel = options?.textLabel ?? 'value';
        const prefix = options?.prefix ?? 'User is focused on:';
        const metaStr = typeof serialized.meta === 'string'
            ? serialized.meta
            : Object.entries(serialized.meta).map(([k, v]) => `${k}: ${String(v)}`).join(', ');
        const parts = [prefix];
        if (metaStr)
            parts.push(metaStr);
        if (serialized.text)
            parts.push(`${textLabel} "${serialized.text}"`);
        return parts.join(' — ');
    }
    destroy() {
        this.observer.unobserve();
        this.emitter.clear();
        this.currentFocus = null;
        this.history = [];
    }
    normalizeMeta(meta, options) {
        const exclude = new Set(options?.excludeKeys ?? []);
        const entries = Object.entries(meta).filter(([key]) => !exclude.has(key));
        const keyOrder = options?.keyOrder ?? [];
        if (keyOrder.length === 0)
            return Object.fromEntries(entries);
        const ordered = [...entries].sort(([a], [b]) => {
            const ai = keyOrder.indexOf(a);
            const bi = keyOrder.indexOf(b);
            const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
            const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
            if (aRank !== bRank)
                return aRank - bRank;
            return 0;
        });
        return Object.fromEntries(ordered);
    }
    normalizeText(text, maxTextLength) {
        if (maxTextLength === undefined)
            return text;
        return text.slice(0, Math.max(0, maxTextLength));
    }
}
//# sourceMappingURL=context.js.map