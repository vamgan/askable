import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { AskableService } from '../askable.service.js';

// Angular's PLATFORM_ID token values
const BROWSER_ID = 'browser';
const SERVER_ID = 'server';

function makeEl(meta: object | string, text = ''): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-askable', typeof meta === 'string' ? meta : JSON.stringify(meta));
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

describe('AskableService (browser)', () => {
  let service: AskableService;
  const attached: HTMLElement[] = [];

  function attach(el: HTMLElement) {
    attached.push(el);
    return el;
  }

  beforeEach(() => {
    // Pass the browser platform ID string directly — Angular's @Inject is just metadata at runtime
    service = new AskableService(BROWSER_ID);
    service.observe(document);
  });

  afterEach(() => {
    service.ngOnDestroy();
    attached.forEach((el) => el.parentNode?.removeChild(el));
    attached.length = 0;
  });

  it('focus signal starts null', () => {
    expect(service.focus()).toBeNull();
  });

  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('focus signal updates when an element is clicked', async () => {
    const el = attach(makeEl({ metric: 'mrr', value: '$128k' }, 'MRR'));
    await tick(); // let MutationObserver bind the new element
    el.click();
    expect(service.focus()).not.toBeNull();
    expect((service.focus()!.meta as Record<string, unknown>).metric).toBe('mrr');
  });

  it('promptContext computed reflects current focus', async () => {
    expect(service.promptContext()).toBe('No UI element is currently focused.');
    const el = attach(makeEl({ metric: 'mrr' }, 'MRR'));
    await tick();
    el.click();
    expect(service.promptContext()).toContain('mrr');
  });

  it('clear() resets focus signal to null', async () => {
    const el = attach(makeEl({ metric: 'churn' }, 'Churn'));
    await tick();
    el.click();
    expect(service.focus()).not.toBeNull();
    service.clear();
    expect(service.focus()).toBeNull();
  });

  it('select() programmatically sets focus', () => {
    const el = attach(makeEl({ widget: 'chart' }, 'Chart'));
    // select() directly sets focus — no observer needed
    service.select(el);
    expect(service.focus()).not.toBeNull();
    expect((service.focus()!.meta as Record<string, unknown>).widget).toBe('chart');
  });

  it('getHistory() returns focuses newest first', async () => {
    const a = attach(makeEl({ id: 'a' }, 'A'));
    const b = attach(makeEl({ id: 'b' }, 'B'));
    await tick();
    a.click();
    b.click();
    const hist = service.getHistory();
    expect(hist).toHaveLength(2);
    expect((hist[0].meta as Record<string, unknown>).id).toBe('b');
  });

  it('getContext() returns the underlying AskableContext', () => {
    const ctx = service.getContext();
    expect(typeof ctx.toPromptContext).toBe('function');
    expect(typeof ctx.observe).toBe('function');
  });
});

describe('AskableService (SSR / server platform)', () => {
  it('observe() is a no-op on the server — does not throw', () => {
    const service = new AskableService(SERVER_ID);
    expect(() => service.observe(document)).not.toThrow();
    expect(service.focus()).toBeNull();
    service.ngOnDestroy();
  });
});
