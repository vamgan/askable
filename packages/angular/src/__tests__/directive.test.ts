import { describe, it, expect, beforeEach } from 'vitest';
import { AskableDirective } from '../askable.directive.js';

// Minimal ElementRef stub — Angular's actual ElementRef is just a wrapper around nativeElement
function makeRef(tag = 'div'): { nativeElement: HTMLElement } {
  return { nativeElement: document.createElement(tag) };
}

describe('AskableDirective', () => {
  let el: { nativeElement: HTMLElement };
  let directive: AskableDirective;

  beforeEach(() => {
    el = makeRef();
    // Angular's DI system passes ElementRef; we pass the stub directly
    directive = new AskableDirective(el as any);
  });

  it('sets data-askable as JSON when meta is an object', () => {
    directive.meta = { chart: 'revenue', period: 'Q3' };
    directive.ngOnInit();
    expect(el.nativeElement.getAttribute('data-askable')).toBe(
      JSON.stringify({ chart: 'revenue', period: 'Q3' })
    );
  });

  it('sets data-askable as a plain string when meta is a string', () => {
    directive.meta = 'main navigation';
    directive.ngOnInit();
    expect(el.nativeElement.getAttribute('data-askable')).toBe('main navigation');
  });

  it('updates data-askable when meta changes via ngOnChanges', () => {
    directive.meta = { v: 1 };
    directive.ngOnInit();
    expect(el.nativeElement.getAttribute('data-askable')).toBe('{"v":1}');

    directive.meta = { v: 2 };
    directive.ngOnChanges({ meta: {} as any });
    expect(el.nativeElement.getAttribute('data-askable')).toBe('{"v":2}');
  });

  it('removes data-askable on ngOnDestroy', () => {
    directive.meta = { x: 1 };
    directive.ngOnInit();
    expect(el.nativeElement.hasAttribute('data-askable')).toBe(true);

    directive.ngOnDestroy();
    expect(el.nativeElement.hasAttribute('data-askable')).toBe(false);
  });
});
