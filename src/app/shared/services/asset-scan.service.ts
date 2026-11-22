import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concat, of, switchMap, timer } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  ASSET_SCAN_AVAILABLE,
  ASSET_SCAN_REJECTED,
  ASSET_SCAN_SCANNING,
  AssetScanState,
} from 'src/app/shared/constants/asset-scan.constants';

/** What an upload endpoint answers with now. */
export interface AcceptedAsset {
  /** The upload to ask about. */
  assetId: string;
  /** How far along it was when the request finished. */
  status: AssetScanState;
}

/** Where an upload has got to, as a watcher sees it. */
export interface AssetScanProgress {
  /** The state to draw. */
  state: AssetScanState;
  /** Whether this is the last word: the file is in use, or it was refused. */
  settled: boolean;
  /** Whether the watch stopped before the file settled either way. */
  gaveUp: boolean;
}

/**
 * How long to wait before each poll, in milliseconds.
 *
 * Brisk at first, because a scan usually finishes in a second or two, and
 * then slower, because the cases that take longer take much longer: a paused
 * worker during a `freshclam` outage is an ordinary state and nothing is
 * gained by asking it twice a second for two minutes.
 */
export const ASSET_SCAN_POLL_DELAYS_MS = [
  1000, 1000, 2000, 3000, 5000, 8000, 10000, 10000, 10000, 10000, 10000, 10000,
  10000, 10000,
];

/**
 * Watching an upload that finishes after the request that started it.
 *
 * Polling, because the site has no server-sent events and no socket, and one
 * endpoint for every upload in the application, because the profile picture,
 * the Character portrait, the seven Storytime slots and the Custom Tracking
 * picture are the same five states to whoever is waiting.
 *
 * **It stops.** After the delays above — a little over a minute of asking —
 * it gives up and says so, rather than leaving a tab polling all afternoon
 * for an upload nobody is watching. Giving up is not failure: the scan will
 * finish and the picture will appear, and the wording says exactly that.
 *
 * **A failed request is not a refusal.** An error is counted as an attempt
 * and the watch carries on, because the one thing worse than making somebody
 * wait is telling them their file was refused when it was not.
 */
@Injectable({ providedIn: 'root' })
export class AssetScanService {
  private readonly _http = inject(HttpClient);

  /**
   * Asks once where an upload has got to.
   *
   * @param assetId - The upload to ask about.
   * @returns What the server says.
   */
  status(assetId: string): Observable<AcceptedAsset> {
    return this._http.get<AcceptedAsset>(API_URLS.FILE_ASSET_STATUS(assetId));
  }

  /**
   * Follows an upload until it is in use, refused, or taking too long.
   *
   * Emits every state it sees, so a caller can draw the strip as it moves,
   * and completes on the last one.
   *
   * @param assetId - The upload to follow.
   * @param from - The state the upload endpoint already reported.
   * @returns Each state in turn.
   */
  watch(
    assetId: string,
    from: AssetScanState = ASSET_SCAN_SCANNING,
  ): Observable<AssetScanProgress> {
    return concat(
      of({ state: from, settled: false, gaveUp: false }),
      this.poll(assetId, 0),
    );
  }

  /**
   * Waits, asks, and decides whether to ask again.
   *
   * @param assetId - The upload to follow.
   * @param attempt - How many times it has been asked already.
   * @returns The rest of the watch.
   */
  private poll(
    assetId: string,
    attempt: number,
  ): Observable<AssetScanProgress> {
    return timer(ASSET_SCAN_POLL_DELAYS_MS[attempt]).pipe(
      switchMap(() =>
        this.status(assetId).pipe(
          catchError(() =>
            // Not a refusal. Something between here and the registry did
            // not answer, and the file is no worse off for it.
            of({ assetId, status: ASSET_SCAN_SCANNING } as AcceptedAsset),
          ),
        ),
      ),
      switchMap(({ status }) => this.next(assetId, attempt, status)),
    );
  }

  /**
   * Decides what a reported state means for the watch.
   *
   * @param assetId - The upload to follow.
   * @param attempt - How many times it has been asked already.
   * @param state - What the server said.
   * @returns The rest of the watch.
   */
  private next(
    assetId: string,
    attempt: number,
    state: AssetScanState,
  ): Observable<AssetScanProgress> {
    if (state === ASSET_SCAN_AVAILABLE || state === ASSET_SCAN_REJECTED) {
      return of({ state, settled: true, gaveUp: false });
    }

    if (attempt + 1 >= ASSET_SCAN_POLL_DELAYS_MS.length) {
      return of({ state, settled: false, gaveUp: true });
    }

    return concat(
      of({ state, settled: false, gaveUp: false }),
      this.poll(assetId, attempt + 1),
    );
  }
}
