import { Injectable, Renderer2 } from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import { AlertColor } from '../constants/lcars-theme.constants';
import {
  MILLISECONDS_SHOW_ALERT_THEME,
  MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME,
} from '../constants/timings.constants';

@Injectable({
  providedIn: 'root',
})
export class AlertThemeService {
  stopTimers$ = new Subject<void>();

  applyAlertTheme(renderer: Renderer2, el: Element, color: AlertColor): void {
    this.applyAlertStylesheet(renderer, el, this.getAnimatedCssUri(color));
  }

  applyAlertStaticTheme(
    renderer: Renderer2,
    el: Element,
    color: AlertColor,
  ): void {
    this.applyAlertStylesheet(renderer, el, this.getStaticCssUri(color));
  }

  private applyAlertStylesheet(
    renderer: Renderer2,
    el: Element,
    cssUri: string,
  ): void {
    const alertStyleLink = renderer.createElement('link');

    renderer.setAttribute(alertStyleLink, 'rel', 'stylesheet');
    renderer.setAttribute(alertStyleLink, 'href', cssUri);
    renderer.setAttribute(alertStyleLink, 'id', 'alert-theme-style-link');

    renderer.appendChild(el.ownerDocument.head, alertStyleLink);
  }

  private getAnimatedCssUri(color: AlertColor): string {
    switch (color) {
      case 'green':
        return 'assets/lcars/lcars-green-alert.css';
      case 'yellow':
        return 'assets/lcars/lcars-yellow-alert.css';
      case 'red':
      default:
        return 'assets/lcars/lcars-red-alert.css';
    }
  }

  private getStaticCssUri(color: AlertColor): string {
    switch (color) {
      case 'green':
        return 'assets/lcars/lcars-green-alert-static.css';
      case 'yellow':
        return 'assets/lcars/lcars-yellow-alert-static.css';
      case 'red':
      default:
        return 'assets/lcars/lcars-red-alert-static.css';
    }
  }

  applyAlertThemeThenClearAfterAShortTime(
    renderer: Renderer2,
    el: Element,
    color: AlertColor,
  ): void {
    this.applyAlertTheme(renderer, el, color);

    setTimeout(() => {
      this.stopTimers$.next();
      this.clearAlertStylesheet(renderer, el);
    }, MILLISECONDS_SHOW_ALERT_THEME);
  }

  applyAlertThemeThenApplyStaticTheme(
    renderer: Renderer2,
    el: Element,
    color: AlertColor = 'red',
  ): void {
    this.applyAlertTheme(renderer, el, color);

    timer(MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME)
      .pipe(takeUntil(this.stopTimers$))
      .subscribe(() => {
        this.applyAlertStaticTheme(renderer, el, color);
      });
  }

  clearTimers(): void {
    this.stopTimers$.next();
  }

  clearAlertStylesheet(renderer: Renderer2, el: Element): void {
    const styleLink = el.ownerDocument.head.querySelector(
      '#alert-theme-style-link',
    );
    if (styleLink) {
      renderer.removeChild(el.ownerDocument.head, styleLink);
    }
  }
}
