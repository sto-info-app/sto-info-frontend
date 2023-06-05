import { Injectable, Renderer2 } from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import {
  MILLISECONDS_SHOW_RED_ALERT_THEME,
  MILLISECONDS_SWITCH_TO_RED_ALERT_STATIC_THEME,
} from '../constants/timings.constants';

@Injectable({
  providedIn: 'root',
})
export class RedAlertThemeService {
  private stopTimers$ = new Subject<void>();

  applyRedAlertTheme(renderer: Renderer2, el: Element): void {
    this.applyRedAlertStylesheet(
      renderer,
      el,
      'assets/lcars/lcars-red-alert.css',
    );
  }

  applyRedAlertStaticTheme(renderer: Renderer2, el: Element): void {
    this.applyRedAlertStylesheet(
      renderer,
      el,
      'assets/lcars/lcars-red-alert-static.css',
    );
  }

  applyRedAlertStylesheet(
    renderer: Renderer2,
    el: Element,
    cssUri: string,
  ): void {
    const errorStyleLink = renderer.createElement('link');

    renderer.setAttribute(errorStyleLink, 'rel', 'stylesheet');
    renderer.setAttribute(errorStyleLink, 'href', cssUri);
    renderer.setAttribute(errorStyleLink, 'id', 'red-alert-style-link');

    renderer.appendChild(el.ownerDocument.head, errorStyleLink);
  }

  applyRedAlertThemeThenClearAfterAShortTime(renderer: Renderer2, el: Element) {
    this.applyRedAlertTheme(renderer, el);

    setTimeout(() => {
      this.stopTimers$.next();
      this.clearRedAlertStylesheet(renderer, el);
    }, MILLISECONDS_SHOW_RED_ALERT_THEME);
  }

  applyRedAlertThemeThenApplyStaticRedTheme(renderer: Renderer2, el: Element) {
    this.applyRedAlertTheme(renderer, el);

    timer(MILLISECONDS_SWITCH_TO_RED_ALERT_STATIC_THEME)
      .pipe(takeUntil(this.stopTimers$))
      .subscribe(() => {
        this.applyRedAlertStaticTheme(renderer, el);
      });
  }

  clearTimers(): void {
    this.stopTimers$.next();
  }

  clearRedAlertStylesheet(renderer: Renderer2, el: Element): void {
    const styleLink = el.ownerDocument.head.querySelector(
      '#red-alert-style-link',
    );
    if (styleLink) {
      renderer.removeChild(el.ownerDocument.head, styleLink);
    }
  }
}
