import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';

export interface ScriptLoadOptions {
  id: string;
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  textContent?: string;
  attributes?: Record<string, string>;
  onLoad?: () => void;
  onError?: (event: Event) => void;
}

@Injectable({ providedIn: 'root' })
export class ScriptLoaderService {
  private readonly _renderer: Renderer2;
  private readonly _documentRef: Document | null;

  constructor() {
    const rendererFactory = inject(RendererFactory2);
    this._renderer = rendererFactory.createRenderer(null, null);
    this._documentRef = inject(DOCUMENT, { optional: true });
  }

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

  removeScript(id: string): void {
    if (!this._documentRef) {
      return;
    }

    const existingScript = this._documentRef.getElementById(id);
    existingScript?.remove();
  }
}
