import type { AskableFocus } from './types.js';

type FocusCallback = (focus: AskableFocus) => void;

function parseMeta(raw: string): Record<string, unknown> | string {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw;
  }
}

function extractText(el: HTMLElement): string {
  const text = (el.textContent ?? '').trim();
  return text.length > 200 ? text.slice(0, 200) : text;
}

function buildFocus(el: HTMLElement): AskableFocus | null {
  const raw = el.getAttribute('data-askable');
  if (raw === null) return null;
  return {
    meta: parseMeta(raw),
    text: extractText(el),
    element: el,
    timestamp: Date.now(),
  };
}

export class Observer {
  private root: HTMLElement | Document | null = null;
  private mutationObserver: MutationObserver | null = null;
  private boundElements = new Set<HTMLElement>();
  private onFocus: FocusCallback;

  constructor(onFocus: FocusCallback) {
    this.onFocus = onFocus;
  }

  observe(root: HTMLElement | Document): void {
    if (this.root) this.unobserve();
    this.root = root;

    // Attach to existing elements
    const rootEl = root instanceof Document ? root.documentElement : root;
    rootEl.querySelectorAll<HTMLElement>('[data-askable]').forEach((el) => this.attach(el));

    // Watch for new elements
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.hasAttribute('data-askable')) this.attach(node);
          node.querySelectorAll<HTMLElement>('[data-askable]').forEach((el) => this.attach(el));
        });
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) this.detach(node);
        });
      }
    });

    this.mutationObserver.observe(root, { childList: true, subtree: true });
  }

  unobserve(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.boundElements.forEach((el) => this.detach(el));
    this.boundElements.clear();
    this.root = null;
  }

  private handleInteraction = (event: Event): void => {
    const el = event.currentTarget as HTMLElement;
    const focus = buildFocus(el);
    if (focus) this.onFocus(focus);
  };

  private attach(el: HTMLElement): void {
    if (this.boundElements.has(el)) return;
    el.addEventListener('focus', this.handleInteraction);
    el.addEventListener('click', this.handleInteraction);
    el.addEventListener('mouseenter', this.handleInteraction);
    this.boundElements.add(el);
  }

  private detach(el: HTMLElement): void {
    el.removeEventListener('focus', this.handleInteraction);
    el.removeEventListener('click', this.handleInteraction);
    el.removeEventListener('mouseenter', this.handleInteraction);
    this.boundElements.delete(el);
  }
}
