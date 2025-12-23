import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';
import { ScriptLoadOptions } from '../models/script-loader.interface';

@Injectable({ providedIn: 'root' })
export class ScriptLoaderService {
  private readonly _renderer: Renderer2;
  private readonly _documentRef: Document | null;

  constructor() {
    const rendererFactory = inject(RendererFactory2);
    this._renderer = rendererFactory.createRenderer(null, null);
    this._documentRef = inject(DOCUMENT, { optional: true });
  }

  /**
   * Load a script dynamically into the document head
   * @param options Script load options
   * @returns The created script element or null if document is not available
   */
  loadScript(options: ScriptLoadOptions): HTMLScriptElement | null {
    if (!this._documentRef?.head) {
      return null;
    }

    this.removeScript(options.id);

    const script = this._renderer.createElement('script') as HTMLScriptElement;
    script.id = options.id;
    script.type = options.type ?? 'text/javascript';
    script.async = options.async ?? false;
    script.defer = options.defer ?? false;

    if (options.src) {
      this._renderer.setAttribute(script, 'src', options.src);
    }

    if (options.textContent) {
      script.text = options.textContent;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        this._renderer.setAttribute(script, key, value);
      });
    }

    if (options.onLoad) {
      script.onload = options.onLoad;
    }

    if (options.onError) {
      script.onerror = event => {
        if (typeof event !== 'string') {
          options.onError?.(event);
        }
      };
    }

    this._renderer.appendChild(this._documentRef.head, script);
    return script;
  }

  /**
   * Remove a previously loaded script by ID
   * @param id The script element ID
   * @returns void
   */
  removeScript(id: string): void {
    if (!this._documentRef) {
      return;
    }

    const existingScript = this._documentRef.getElementById(id);
    existingScript?.remove();
  }

  /**
   * Check for the presence of a cookie that indicates analytics should be disabled.
   * @returns True when analytics should be disabled.
   * @remarks This is based on the presence of a cookie named `stoi_no_analytics`
   * with a value of `1` that is set via a Cloudflare worker for testing.
   */
  shouldDisableAnalytics(): boolean {
    return document.cookie
      .split('; ')
      .some(c => c.startsWith('stoi_no_analytics=1'));
  }
}
