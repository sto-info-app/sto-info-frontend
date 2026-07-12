import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective implements OnInit, OnDestroy {
  @Output()
  appResizeObserver = new EventEmitter<DOMRectReadOnly>();

  private observer!: ResizeObserver;
  private readonly _elementRef = inject(ElementRef);

  /**
   * Starts observing element size changes and emits each resize rectangle.
   */
  ngOnInit(): void {
    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.appResizeObserver.emit(entry.contentRect);
      }
    });

    this.observer.observe(this._elementRef.nativeElement);
  }

  /**
   * Disconnects the active resize observer.
   */
  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
