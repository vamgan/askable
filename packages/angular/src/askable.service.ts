import { Injectable, OnDestroy, signal, computed, PLATFORM_ID, Inject } from '@angular/core';
import { createAskableContext } from '@askable-ui/core';
import type { AskableContext, AskableFocus, AskableObserveOptions } from '@askable-ui/core';

// Inline the browser check — avoids importing @angular/common which requires the JIT compiler
function isBrowserPlatform(platformId: object): boolean {
  return (platformId as unknown as string) === 'browser';
}

@Injectable({ providedIn: 'root' })
export class AskableService implements OnDestroy {
  private readonly ctx: AskableContext = createAskableContext();
  private readonly isBrowser: boolean;

  /** Reactive signal containing the current focused element's context. */
  readonly focus = signal<AskableFocus | null>(null);

  /** Computed signal returning the prompt-ready context string. */
  readonly promptContext = computed(() => {
    void this.focus(); // track dependency
    return this.ctx.toPromptContext();
  });

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isBrowserPlatform(platformId);

    if (this.isBrowser) {
      this.ctx.on('focus', (f) => this.focus.set(f));
      this.ctx.on('clear', () => this.focus.set(null));
    }
  }

  /**
   * Start observing a root element for [data-askable] interactions.
   * Call this from a component's ngAfterViewInit or in an APP_INITIALIZER.
   * Defaults to `document` if called without arguments.
   */
  observe(root: HTMLElement | Document = document, options?: AskableObserveOptions): void {
    if (!this.isBrowser) return;
    this.ctx.observe(root, options);
  }

  /** Stop observing. */
  unobserve(): void {
    this.ctx.unobserve();
  }

  /** Programmatically focus an element — use for "Ask AI" buttons. */
  select(element: HTMLElement): void {
    this.ctx.select(element);
  }

  /** Reset focused context to null. */
  clear(): void {
    this.ctx.clear();
  }

  /** Return focus history (newest first). */
  getHistory(limit?: number): AskableFocus[] {
    return this.ctx.getHistory(limit);
  }

  /** Access the underlying AskableContext for advanced use. */
  getContext(): AskableContext {
    return this.ctx;
  }

  ngOnDestroy(): void {
    this.ctx.destroy();
  }
}
