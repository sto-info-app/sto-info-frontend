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
  private readonly elementRef = inject(ElementRef);

  ngOnInit(): void {
    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.appResizeObserver.emit(entry.contentRect);
      }
    });

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
