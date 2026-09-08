import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { CustomTrackingConfigurationService } from './custom-tracking-configuration.service';
import { aConfiguration } from './custom-tracking.testing';

describe('CustomTrackingConfigurationService', () => {
  let service: CustomTrackingConfigurationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CustomTrackingConfigurationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CustomTrackingConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('describes the feature', async () => {
    const result = firstValueFrom(service.getConfiguration());

    httpMock
      .expectOne(API_URLS.CUSTOM_TRACKING_CONFIGURATION)
      .flush(aConfiguration());

    await expect(result).resolves.toEqual(
      expect.objectContaining({ palette: expect.any(Array) }),
    );
  });

  // It describes the shape of the feature rather than anybody's data, so
  // asking again per page would be a request for an answer that cannot have
  // changed.
  it('asks once however many callers want it', async () => {
    const first = firstValueFrom(service.getConfiguration());
    const second = firstValueFrom(service.getConfiguration());

    httpMock
      .expectOne(API_URLS.CUSTOM_TRACKING_CONFIGURATION)
      .flush(aConfiguration());

    await expect(first).resolves.toEqual(await second);
  });

  // Anonymous, because a visitor reading somebody's public page needs the same
  // palette the owner does.
  it('sends no authorization header', () => {
    firstValueFrom(service.getConfiguration());

    const request = httpMock.expectOne(API_URLS.CUSTOM_TRACKING_CONFIGURATION);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(aConfiguration());
  });
});
