import { Injectable, OnDestroy, Renderer2 } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { AlertState } from '../constants/lcars-theme.constants';
import {
  MILLISECONDS_SHOW_ALERT_THEME,
  MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME,
} from '../constants/timings.constants';

@Injectable({
  providedIn: 'root',
})
export class AlertThemeService implements OnDestroy {
  private static readonly ANIMATED_LINK_ID = 'alert-theme-style-link';
  private static readonly STATIC_LINK_ID = 'alert-theme-style-link-static';

  private readonly timersByHost = new Map<Element, Subscription>();

  /**
   * Lifecycle hook invoked when Angular destroys this service.
   *
   * @remarks
   * This service is typically `providedIn: 'root'`, so this will usually run only
   * on application tear down. It ensures any outstanding timers are cancelled.
   */
  ngOnDestroy(): void {
    this.clearTimers();
    this.timersByHost?.clear();
  }

  /**
   * Cancels and forgets any pending timer associated with the provided host element.
   *
   * @param host Element used as the timer ownership key.
   */
  private clearTimerForHost(host: Element): void {
    const existing = this.timersByHost.get(host);
    if (existing) {
      existing.unsubscribe();
      this.timersByHost.delete(host);
    }
  }

  /**
   * Applies the animated/base alert theme stylesheet for the given alert state.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   * @param color Target alert state.
   *
   * @remarks When (re)applying the alert theme, reset both animated+static.
   */
  applyAlertTheme(renderer: Renderer2, el: Element, color: AlertState): void {
    this.clearAlertStylesheet(renderer, el);
    this.upsertStylesheet(
      renderer,
      el,
      this.getAnimatedCssUri(color),
      AlertThemeService.ANIMATED_LINK_ID,
    );
  }

  /**
   * Applies the static alert theme stylesheet for the given alert state.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   * @param color Target alert state.
   *
   * @remarks
   * The static stylesheet is applied in addition to the animated/base stylesheet
   * (it is appended after it, so it can act as an override).
   */
  applyAlertStaticTheme(
    renderer: Renderer2,
    el: Element,
    color: AlertState,
  ): void {
    this.upsertStylesheet(
      renderer,
      el,
      this.getStaticCssUri(color),
      AlertThemeService.STATIC_LINK_ID,
    );
  }

  /**
   * Ensures the given stylesheet link is present in `document.head` with the supplied id.
   *
   * @remarks
   * This removes any existing link(s) with the same id to avoid duplicates, then appends
   * a new link at the end of `<head>` so it has later precedence in the cascade.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   * @param cssUri Stylesheet URL to load.
   * @param id DOM id assigned to the `<link>` element.
   */
  private upsertStylesheet(
    renderer: Renderer2,
    el: Element,
    cssUri: string,
    id: string,
  ): void {
    const head = el.ownerDocument.head;
    const existingLinks = head.querySelectorAll(`#${id}`);
    existingLinks.forEach(existing => renderer.removeChild(head, existing));

    const link = renderer.createElement('link');
    renderer.setAttribute(link, 'rel', 'stylesheet');
    renderer.setAttribute(link, 'href', cssUri);
    renderer.setAttribute(link, 'id', id);

    // Append at end so later links win in the cascade.
    renderer.appendChild(head, link);
  }

  /**
   * Resolves the animated/base stylesheet URI for the given alert state.
   *
   * @param color Alert state.
   * @returns Stylesheet path under `assets/`.
   */
  private getAnimatedCssUri(color: AlertState): string {
    switch (color) {
      case 'green':
        return 'assets/lcars/lcars-green-alert.css';
      case 'yellow':
        return 'assets/lcars/lcars-yellow-alert.css';
      case 'blue':
        return 'assets/lcars/lcars-blue-alert.css';
      case 'grey':
        return 'assets/lcars/lcars-grey-alert.css';
      case 'red':
      default:
        return 'assets/lcars/lcars-red-alert.css';
    }
  }

  /**
   * Resolves the static stylesheet URI for the given alert state.
   *
   * @param color Alert state.
   * @returns Stylesheet path under `assets/`.
   */
  private getStaticCssUri(color: AlertState): string {
    switch (color) {
      case 'green':
        return 'assets/lcars/lcars-green-alert-static.css';
      case 'yellow':
        return 'assets/lcars/lcars-yellow-alert-static.css';
      case 'blue':
        return 'assets/lcars/lcars-blue-alert-static.css';
      case 'grey':
        return 'assets/lcars/lcars-grey-alert-static.css';
      case 'red':
      default:
        return 'assets/lcars/lcars-red-alert-static.css';
    }
  }

  /**
   * Applies the animated/base alert theme and automatically clears it after a short time.
   *
   * @remarks
   * The timer is tracked per host element so different pages/components do not cancel
   * each other.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   * @param color Alert state to apply.
   */
  applyAlertThemeThenClearAfterAShortTime(
    renderer: Renderer2,
    el: Element,
    color: AlertState = 'red',
  ): void {
    this.clearTimers(el);
    this.applyAlertTheme(renderer, el, color);

    const sub = timer(MILLISECONDS_SHOW_ALERT_THEME).subscribe(() => {
      this.clearAlertStylesheet(renderer, el);
      this.clearTimerForHost(el);
    });
    this.timersByHost.set(el, sub);
  }

  /**
   * Applies the animated/base alert theme, then applies the static overlay after a delay.
   *
   * @remarks
   * The animated stylesheet remains in place; the static stylesheet is applied in addition
   * as an override.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   * @param color Alert state to apply.
   */
  applyAlertThemeThenApplyStaticTheme(
    renderer: Renderer2,
    el: Element,
    color: AlertState = 'red',
  ): void {
    this.clearTimers(el);
    this.applyAlertTheme(renderer, el, color);

    const sub = timer(MILLISECONDS_SWITCH_TO_ALERT_STATIC_THEME).subscribe(
      () => {
        this.applyAlertStaticTheme(renderer, el, color);
        this.clearTimerForHost(el);
      },
    );
    this.timersByHost.set(el, sub);
  }

  /**
   * Cancels pending theme timers.
   *
   * @param el Optional host element to cancel only that element's timer.
   * If omitted, cancels all tracked timers.
   */
  clearTimers(el?: Element): void {
    if (el) {
      this.clearTimerForHost(el);
      return;
    }

    this.timersByHost.forEach(sub => sub.unsubscribe());
    this.timersByHost.clear();
  }

  /**
   * Removes any alert theme stylesheet links (animated and static) from the document head.
   *
   * @param renderer Angular Renderer2 instance.
   * @param el Host element whose `ownerDocument` is used to locate `document.head`.
   */
  clearAlertStylesheet(renderer: Renderer2, el: Element): void {
    const head = el.ownerDocument.head;
    const styleLinks = head.querySelectorAll(
      `#${AlertThemeService.ANIMATED_LINK_ID}, #${AlertThemeService.STATIC_LINK_ID}`,
    );

    styleLinks.forEach(styleLink => {
      renderer.removeChild(head, styleLink);
    });
  }
}
