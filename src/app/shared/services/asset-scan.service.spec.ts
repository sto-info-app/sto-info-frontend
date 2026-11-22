import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import {
  ASSET_SCAN_POLL_DELAYS_MS,
  AssetScanProgress,
  AssetScanService,
} from './asset-scan.service';

describe('AssetScanService', () => {
  const url = API_URLS.FILE_ASSET_STATUS('asset-1');

  let service: AssetScanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssetScanService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AssetScanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Answers the next poll with one status.
   *
   * @param status - What the server says this time.
   */
  const answer = (status: string): void => {
    httpMock.expectOne(url).flush({ assetId: 'asset-1', status });
  };

  it('asks where one upload has got to', () => {
    const seen: unknown[] = [];

    service.status('asset-1').subscribe(value => seen.push(value));
    answer('SCANNING');

    expect(seen).toEqual([{ assetId: 'asset-1', status: 'SCANNING' }]);
  });

  it('reports the state it was given before asking anything', () => {
    const seen: AssetScanProgress[] = [];

    service.watch('asset-1', 'AWAITING_SCAN').subscribe(p => seen.push(p));

    expect(seen).toEqual([
      { state: 'AWAITING_SCAN', settled: false, gaveUp: false },
    ]);

    httpMock.expectNone(url);
  });

  it('follows an upload until it is in use', fakeAsync(() => {
    const seen: AssetScanProgress[] = [];
    let completed = false;

    service.watch('asset-1').subscribe({
      next: progress => seen.push(progress),
      complete: () => {
        completed = true;
      },
    });

    tick(ASSET_SCAN_POLL_DELAYS_MS[0]);
    answer('SCANNING');

    tick(ASSET_SCAN_POLL_DELAYS_MS[1]);
    answer('AVAILABLE');

    expect(seen).toEqual([
      { state: 'SCANNING', settled: false, gaveUp: false },
      { state: 'SCANNING', settled: false, gaveUp: false },
      { state: 'AVAILABLE', settled: true, gaveUp: false },
    ]);
    expect(completed).toBe(true);

    flush();
  }));

  it('stops at a refusal', fakeAsync(() => {
    const seen: AssetScanProgress[] = [];

    service.watch('asset-1').subscribe(progress => seen.push(progress));

    tick(ASSET_SCAN_POLL_DELAYS_MS[0]);
    answer('REJECTED');

    expect(seen[seen.length - 1]).toEqual({
      state: 'REJECTED',
      settled: true,
      gaveUp: false,
    });

    flush();
  }));

  // The one thing worse than making somebody wait is telling them their
  // file was refused when it was not.
  it('treats a failed request as a reason to ask again', fakeAsync(() => {
    const seen: AssetScanProgress[] = [];

    service.watch('asset-1').subscribe(progress => seen.push(progress));

    tick(ASSET_SCAN_POLL_DELAYS_MS[0]);
    httpMock.expectOne(url).error(new ProgressEvent('network'));

    tick(ASSET_SCAN_POLL_DELAYS_MS[1]);
    answer('AVAILABLE');

    expect(seen[seen.length - 1].state).toBe('AVAILABLE');

    flush();
  }));

  // It stops rather than leaving a tab polling all afternoon for an upload
  // nobody is watching. Giving up is not failure.
  it('gives up after the last delay, saying so', fakeAsync(() => {
    const seen: AssetScanProgress[] = [];
    let completed = false;

    service.watch('asset-1').subscribe({
      next: progress => seen.push(progress),
      complete: () => {
        completed = true;
      },
    });

    for (const delay of ASSET_SCAN_POLL_DELAYS_MS) {
      tick(delay);
      answer('SCANNING');
    }

    expect(seen[seen.length - 1]).toEqual({
      state: 'SCANNING',
      settled: false,
      gaveUp: true,
    });
    expect(completed).toBe(true);

    flush();
  }));
});
