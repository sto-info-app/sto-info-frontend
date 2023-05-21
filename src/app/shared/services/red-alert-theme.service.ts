import { Injectable, Renderer2 } from '@angular/core';
import {
  MILLISECONDS_SHOW_RED_ALERT_THEME,
  MILLISECONDS_SWITCH_TO_RED_ALERT_STATIC_THEME,
} from '../constants/timings.constants';

@Injectable({
  providedIn: 'root',
})
export class RedAlertThemeService {
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
      this.clearRedAlertStylesheet(renderer, el);
    }, MILLISECONDS_SHOW_RED_ALERT_THEME);
  }

  applyRedAlertThemeThenApplyStaticRedTheme(renderer: Renderer2, el: Element) {
    this.applyRedAlertTheme(renderer, el);

    setTimeout(() => {
      this.applyRedAlertStaticTheme(renderer, el);
    }, MILLISECONDS_SWITCH_TO_RED_ALERT_STATIC_THEME);
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
