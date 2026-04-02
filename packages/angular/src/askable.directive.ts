import {
  Directive,
  Input,
  ElementRef,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';

/**
 * [askable] directive — sets or updates the `data-askable` attribute on the host element.
 *
 * Usage:
 *   <div [askable]="{ chart: 'revenue', period: 'Q3' }">...</div>
 *   <div askable="plain string label">...</div>
 */
@Directive({
  selector: '[askable]',
  standalone: true,
})
export class AskableDirective implements OnInit, OnChanges, OnDestroy {
  @Input('askable') meta: Record<string, unknown> | string = {};

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.updateAttribute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meta']) this.updateAttribute();
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeAttribute('data-askable');
  }

  private updateAttribute(): void {
    const value =
      typeof this.meta === 'string' ? this.meta : JSON.stringify(this.meta);
    this.el.nativeElement.setAttribute('data-askable', value);
  }
}
