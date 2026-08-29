import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  ContentRating,
  STORYTIME_AVAILABILITY_DISABLED,
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
  StorytimeConfiguration,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StorytimeService } from './storytime.service';

const enabledConfiguration: StorytimeConfiguration = {
  features: {
    isEnabled: true,
    publicReadEnabled: true,
    creationEnabled: true,
    youTubeEnabled: true,
    spotlightEnabled: true,
  },
  languages: [
    { code: 'en', name: 'English' },
    { code: 'tlh', name: 'Klingon' },
  ],
  defaultLanguageCode: 'en',
  contentRatings: [ContentRating.GENERAL, ContentRating.MATURE],
};

describe('StorytimeService', () => {
  let service: StorytimeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StorytimeService],
    });

    service = TestBed.inject(StorytimeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('loads the configuration', async () => {
    const configuration = firstValueFrom(service.getConfiguration());

    const request = httpMock.expectOne(API_URLS.STORYTIME_CONFIGURATION);
    expect(request.request.method).toBe('GET');
    request.flush(enabledConfiguration);

    await expect(configuration).resolves.toEqual(enabledConfiguration);
  });

  // The navigation, the route guard and every editor need the same answer.
  it('makes a single request however many callers ask', async () => {
    const first = firstValueFrom(service.isEnabled());
    const second = firstValueFrom(service.getLanguages());

    httpMock
      .expectOne(API_URLS.STORYTIME_CONFIGURATION)
      .flush(enabledConfiguration);

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toHaveLength(2);
    httpMock.expectNone(API_URLS.STORYTIME_CONFIGURATION);
  });

  it('reloads after a refresh', async () => {
    const first = firstValueFrom(service.isEnabled());
    httpMock
      .expectOne(API_URLS.STORYTIME_CONFIGURATION)
      .flush(enabledConfiguration);
    await first;

    service.refresh();

    const second = firstValueFrom(service.isEnabled());
    httpMock.expectOne(API_URLS.STORYTIME_CONFIGURATION).flush({
      ...enabledConfiguration,
      features: { ...enabledConfiguration.features, isEnabled: false },
    });

    await expect(second).resolves.toBe(false);
  });

  it('reports the feature state', async () => {
    const features = firstValueFrom(service.getFeatureState());

    httpMock
      .expectOne(API_URLS.STORYTIME_CONFIGURATION)
      .flush(enabledConfiguration);

    await expect(features).resolves.toEqual(enabledConfiguration.features);
  });

  it('reports Storytime as disabled when the server says so', async () => {
    const enabled = firstValueFrom(service.isEnabled());

    httpMock.expectOne(API_URLS.STORYTIME_CONFIGURATION).flush({
      ...enabledConfiguration,
      features: { ...enabledConfiguration.features, isEnabled: false },
    });

    await expect(enabled).resolves.toBe(false);
  });

  // Showing routes that then fail is worse than showing nothing.
  it('treats a failed load as Storytime being unavailable', async () => {
    const configuration = firstValueFrom(service.getConfiguration());

    httpMock
      .expectOne(API_URLS.STORYTIME_CONFIGURATION)
      .flush('failed', { status: 500, statusText: 'Server Error' });

    const result = await configuration;
    expect(result.features.isEnabled).toBe(false);
    expect(result.features.creationEnabled).toBe(false);
    expect(result.languages).toEqual([]);
  });

  describe('availability', () => {
    it('reports Storytime as enabled when the server says it is on', async () => {
      const availability = firstValueFrom(service.getAvailability());

      httpMock
        .expectOne(API_URLS.STORYTIME_CONFIGURATION)
        .flush(enabledConfiguration);

      await expect(availability).resolves.toBe(STORYTIME_AVAILABILITY_ENABLED);
    });

    it('reports Storytime as disabled when the server says it is off', async () => {
      const availability = firstValueFrom(service.getAvailability());

      httpMock.expectOne(API_URLS.STORYTIME_CONFIGURATION).flush({
        ...enabledConfiguration,
        features: { ...enabledConfiguration.features, isEnabled: false },
      });

      await expect(availability).resolves.toBe(STORYTIME_AVAILABILITY_DISABLED);
    });

    // A server that could not be asked never said the feature was off, and a
    // caller that cannot tell the two apart answers an outage with a 404.
    it('separates a configuration that could not be loaded from one that is switched off', async () => {
      const availability = firstValueFrom(service.getAvailability());

      httpMock
        .expectOne(API_URLS.STORYTIME_CONFIGURATION)
        .flush('failed', { status: 503, statusText: 'Service Unavailable' });

      await expect(availability).resolves.toBe(
        STORYTIME_AVAILABILITY_UNAVAILABLE,
      );
    });

    // An outage that lasted one request must not switch Storytime off for the
    // rest of the visit.
    it('asks again after a failed load rather than caching the failure', async () => {
      const first = firstValueFrom(service.getAvailability());

      httpMock
        .expectOne(API_URLS.STORYTIME_CONFIGURATION)
        .flush('failed', { status: 0, statusText: 'Unknown Error' });

      await expect(first).resolves.toBe(STORYTIME_AVAILABILITY_UNAVAILABLE);

      const second = firstValueFrom(service.getAvailability());

      httpMock
        .expectOne(API_URLS.STORYTIME_CONFIGURATION)
        .flush(enabledConfiguration);

      await expect(second).resolves.toBe(STORYTIME_AVAILABILITY_ENABLED);
    });
  });
});
