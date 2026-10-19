import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The most addresses the API renews in one request. */
export const MAX_RENEWED_ADDRESSES = 50;

/** How long to gather failed pictures before asking, in milliseconds. */
export const RENEWAL_GATHER_MS = 50;

/** What the API answers. */
interface RenewedImageAddresses {
  /** Each address renewed, in order, or null when it may not be. */
  addresses: (string | null)[];
}

/** An address waiting to be renewed. */
interface WaitingAddress {
  readonly address: string;
  readonly resolve: (renewed: string | null) => void;
}

/**
 * Whether an address is a signed Cloudflare Images address that has expired.
 *
 * @param address - A picture's address.
 * @param now - When, in milliseconds since the epoch.
 * @returns True when it is signed and its `exp` has passed.
 */
export function isExpiredSignedAddress(address: string, now: number): boolean {
  let url: URL;

  try {
    url = new URL(address);
  } catch {
    return false;
  }

  const exp = url.searchParams.get('exp');
  const delivered =
    url.hostname === 'imagedelivery.net' ||
    url.pathname.startsWith('/cdn-cgi/imagedelivery/');

  return (
    delivered &&
    url.searchParams.has('sig') &&
    exp !== null &&
    /^\d+$/.test(exp) &&
    Number(exp) * 1000 <= now
  );
}

/**
 * Renews a picture whose signed address expired while its page was open.
 *
 * The API signs every picture's address for at most two hours, so a page
 * left open longer can redraw a picture at an address Cloudflare refuses.
 * One listener on the document catches every picture that fails to load.
 * When its address is signed and has expired, the picture's own error
 * handling is held back while the API is asked for the address again, and
 * the picture tries once more at the new one: signed afresh, or the
 * "photo unavailable" picture if it may no longer be shown. When the API
 * will not renew it, or the new address fails too, the picture's own error
 * handling runs as it always did.
 *
 * Pictures that fail together are renewed in one request, and each address
 * is asked about once.
 */
@Injectable({ providedIn: 'root' })
export class SignedImageRenewalService {
  private readonly _http = inject(HttpClient);
  private readonly _document = inject(DOCUMENT);
  private readonly _zone = inject(NgZone);

  /** Each address asked about, and what it became. */
  private readonly _renewals = new Map<string, Promise<string | null>>();
  /** The address each picture was last renewed from. */
  private readonly _tried = new WeakMap<HTMLImageElement, string>();
  private _waiting: WaitingAddress[] = [];
  private _started = false;

  /**
   * Starts listening, once.
   *
   * @returns void
   */
  start(): void {
    if (this._started) {
      return;
    }

    this._started = true;
    this._zone.runOutsideAngular(() =>
      this._document.addEventListener('error', this.onError, true),
    );
  }

  /**
   * Stops listening.
   *
   * @returns void
   */
  stop(): void {
    this._document.removeEventListener('error', this.onError, true);
    this._started = false;
  }

  /**
   * Catches a picture that would not load, before its own handlers do.
   *
   * @param event - The error, on its way down to the picture.
   * @returns void
   */
  private readonly onError = (event: Event): void => {
    const image = event.target;

    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    const address = image.src;

    if (
      this._tried.get(image) === address ||
      !isExpiredSignedAddress(address, Date.now())
    ) {
      return;
    }

    this._tried.set(image, address);
    event.stopImmediatePropagation();

    void this.renew(address).then(renewed => {
      if (image.src !== address) {
        return;
      }

      if (renewed !== null && renewed !== address) {
        image.src = renewed;
      } else {
        image.dispatchEvent(new Event('error'));
      }
    });
  };

  /**
   * The address an expired one becomes.
   *
   * @param address - The expired address.
   * @returns The renewed address, or null.
   */
  private renew(address: string): Promise<string | null> {
    let renewal = this._renewals.get(address);

    if (renewal === undefined) {
      renewal = new Promise<string | null>(resolve => {
        this._waiting.push({ address, resolve });

        if (this._waiting.length === 1) {
          setTimeout(() => this.ask(), RENEWAL_GATHER_MS);
        }
      });
      this._renewals.set(address, renewal);
    }

    return renewal;
  }

  /**
   * Asks the API to renew everything waiting.
   *
   * @returns void
   */
  private ask(): void {
    const waiting = this._waiting;

    this._waiting = [];

    for (
      let start = 0;
      start < waiting.length;
      start += MAX_RENEWED_ADDRESSES
    ) {
      const batch = waiting.slice(start, start + MAX_RENEWED_ADDRESSES);

      this._http
        .post<RenewedImageAddresses>(API_URLS.RENEW_IMAGE_ADDRESSES, {
          addresses: batch.map(each => each.address),
        })
        .subscribe({
          next: ({ addresses }) =>
            batch.forEach((each, index) =>
              each.resolve(addresses?.[index] ?? null),
            ),
          error: () =>
            batch.forEach(each => {
              // A failed request may be asked again by the next picture.
              this._renewals.delete(each.address);
              each.resolve(null);
            }),
        });
    }
  }
}
