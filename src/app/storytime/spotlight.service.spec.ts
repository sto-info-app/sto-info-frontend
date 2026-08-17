import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SpotlightEntityType } from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { SpotlightService } from './spotlight.service';

const AUTH_HEADER = 'Bearer token-1';
const SPOTLIGHT_ID = 'spotlight-1';

describe('SpotlightService', () => {
  let service: SpotlightService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SpotlightService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(SpotlightService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    // Reading the Spotlight is the most public thing on the site.
    it('lists what is showing without a token', async () => {
      const showing = firstValueFrom(service.getSpotlight());

      const request = httpMock.expectOne(API_URLS.STORYTIME_SPOTLIGHT);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(showing).resolves.toEqual([]);
    });

    it('lists the archive', async () => {
      const past = firstValueFrom(service.getArchive());

      httpMock.expectOne(`${API_URLS.STORYTIME_SPOTLIGHT}/archive`).flush([]);

      await expect(past).resolves.toEqual([]);
    });

    it('reads one selection', async () => {
      const entry = firstValueFrom(service.getEntry('a-fine-story'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_SPOTLIGHT}/a-fine-story`)
        .flush({ id: SPOTLIGHT_ID });

      await expect(entry).resolves.toEqual({ id: SPOTLIGHT_ID });
    });

    it('encodes an awkward slug', async () => {
      const entry = firstValueFrom(service.getEntry('a b'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_SPOTLIGHT}/a%20b`)
        .flush({ id: SPOTLIGHT_ID });

      await expect(entry).resolves.toBeDefined();
    });
  });

  describe('editing', () => {
    it('lists every entry with the token attached', async () => {
      const entries = firstValueFrom(service.getAll());

      const request = httpMock.expectOne(API_URLS.STORYTIME_ADMIN_SPOTLIGHT);
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(entries).resolves.toEqual([]);
    });

    it('reads one entry', async () => {
      const entry = firstValueFrom(service.getOne(SPOTLIGHT_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${SPOTLIGHT_ID}`)
        .flush({ id: SPOTLIGHT_ID });

      await expect(entry).resolves.toBeDefined();
    });

    it('drafts an entry', async () => {
      const created = firstValueFrom(
        service.create({
          entityType: SpotlightEntityType.STORY,
          storyId: 'story-1',
          headline: 'A Fine Story',
          summary: 'Worth your evening.',
          startsAt: '2026-06-01T00:00:00.000Z',
        }),
      );

      const request = httpMock.expectOne(API_URLS.STORYTIME_ADMIN_SPOTLIGHT);
      expect(request.request.method).toBe('POST');
      expect(request.request.body.storyId).toBe('story-1');
      request.flush({ id: SPOTLIGHT_ID });

      await expect(created).resolves.toBeDefined();
    });

    it('changes an entry', async () => {
      const updated = firstValueFrom(
        service.update(SPOTLIGHT_ID, { headline: 'Read This' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${SPOTLIGHT_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: SPOTLIGHT_ID });

      await expect(updated).resolves.toBeDefined();
    });

    it.each([
      ['publish', () => service.publish(SPOTLIGHT_ID)],
      ['unpublish', () => service.unpublish(SPOTLIGHT_ID)],
    ])('%ses an entry', async (action, act) => {
      const result = firstValueFrom(act());

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${SPOTLIGHT_ID}/${action}`,
      );
      expect(request.request.method).toBe('POST');
      request.flush({ id: SPOTLIGHT_ID });

      await expect(result).resolves.toBeDefined();
    });

    it('deletes an entry', async () => {
      const removed = firstValueFrom(service.remove(SPOTLIGHT_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${SPOTLIGHT_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await expect(removed).resolves.toBeNull();
    });
  });

  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each([
      ['getAll', () => service.getAll()],
      ['getOne', () => service.getOne(SPOTLIGHT_ID)],
      [
        'create',
        () =>
          service.create({
            entityType: SpotlightEntityType.STORY,
            storyId: 'story-1',
            headline: 'H',
            summary: 'S',
            startsAt: '2026-06-01T00:00:00.000Z',
          }),
      ],
      ['update', () => service.update(SPOTLIGHT_ID, {})],
      ['publish', () => service.publish(SPOTLIGHT_ID)],
      ['unpublish', () => service.unpublish(SPOTLIGHT_ID)],
      ['remove', () => service.remove(SPOTLIGHT_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    it('still reads the Spotlight', async () => {
      const showing = firstValueFrom(service.getSpotlight());

      httpMock.expectOne(API_URLS.STORYTIME_SPOTLIGHT).flush([]);

      await expect(showing).resolves.toEqual([]);
    });
  });
});
