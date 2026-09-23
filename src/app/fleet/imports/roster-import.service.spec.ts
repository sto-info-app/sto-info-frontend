import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RosterImportDetail,
  RosterImportPage,
  RosterImportPreview,
  RosterImportSummary,
  RosterImportUploadResult,
} from 'src/app/models/fleet-import.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { RosterImportService } from './roster-import.service';

describe('RosterImportService', () => {
  let service: RosterImportService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const communityId = 'community-1';
  const fleetId = 'fleet-1';
  const previewUrl =
    `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
    '/roster-imports/preview';
  const importsUrl =
    `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}` +
    '/roster-imports';

  /** An export, named the way the game names one. */
  const file = new File(['roster bytes'], 'Ninth Fleet_20240101-120000.Csv', {
    type: 'text/csv',
  });

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RosterImportService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(RosterImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('posts to the preview address beneath the Community', () => {
    service.preview(communityId, fleetId, file, 'Europe/London').subscribe();

    const request = httpMock.expectOne(previewUrl);

    expect(request.request.method).toBe('POST');
    request.flush({} as RosterImportPreview);
  });

  // The file and the timezone travel together, because the file does not
  // contain one and nothing about it can be read until somebody says.
  it('sends the export and the timezone in one body', () => {
    service.preview(communityId, fleetId, file, 'America/New_York').subscribe();

    const body = httpMock.expectOne(previewUrl).request.body as FormData;

    expect(body.get('timezone')).toBe('America/New_York');
    expect(body.get('roster')).toBeInstanceOf(File);
    httpMock.expectNone(previewUrl);
  });

  // The filename is the only place an export says which Fleet it is of and
  // when it was taken, so it has to survive the journey exactly.
  it('keeps the filename the game gave the export', () => {
    service.preview(communityId, fleetId, file, 'Europe/London').subscribe();

    const body = httpMock.expectOne(previewUrl).request.body as FormData;

    expect((body.get('roster') as File).name).toBe(
      'Ninth Fleet_20240101-120000.Csv',
    );
  });

  it('sends the access token', () => {
    service.preview(communityId, fleetId, file, 'Europe/London').subscribe();

    const request = httpMock.expectOne(previewUrl);

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
  });

  it('answers with the preview the server built', () => {
    const preview = { canImport: true } as RosterImportPreview;
    let answered: RosterImportPreview | undefined;

    service
      .preview(communityId, fleetId, file, 'Europe/London')
      .subscribe(result => (answered = result));

    httpMock.expectOne(previewUrl).flush(preview);

    expect(answered).toEqual(preview);
  });

  it('asks for nothing when there is no token to ask with', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    let failure: Error | undefined;

    service
      .preview(communityId, fleetId, file, 'Europe/London')
      .subscribe({ error: (error: Error) => (failure = error) });

    expect(failure?.message).toBe('No token found');
    httpMock.expectNone(previewUrl);
  });

  it('sends no chosen moment with a preview', () => {
    service.preview(communityId, fleetId, file, 'Europe/London').subscribe();

    const body = httpMock.expectOne(previewUrl).request.body as FormData;

    expect(body.has('exportedAt')).toBe(false);
  });

  describe('upload', () => {
    const summary = { id: 'import-1' } as RosterImportSummary;

    it('posts the export, its timezone and its name to the collection', () => {
      service
        .upload(communityId, fleetId, file, 'Europe/London', null)
        .subscribe();

      const request = httpMock.expectOne(importsUrl);
      const body = request.request.body as FormData;

      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      expect(body.get('timezone')).toBe('Europe/London');
      expect((body.get('roster') as File).name).toBe(
        'Ninth Fleet_20240101-120000.Csv',
      );
      expect(body.has('exportedAt')).toBe(false);
      request.flush(summary, { status: 202, statusText: 'Accepted' });
    });

    // Only for the hour the clock went back over, and then it is the
    // uploader's answer rather than anything worked out here.
    it('sends the chosen moment when there was one to choose', () => {
      service
        .upload(
          communityId,
          fleetId,
          file,
          'Europe/London',
          '2026-10-25T00:30:00.000Z',
        )
        .subscribe();

      const body = httpMock.expectOne(importsUrl).request.body as FormData;

      expect(body.get('exportedAt')).toBe('2026-10-25T00:30:00.000Z');
    });

    it.each([
      [202, 'Accepted', false],
      [200, 'OK', true],
    ])(
      'reads a %i as repeated: %s',
      (status: number, statusText: string, repeated: boolean) => {
        let answered: RosterImportUploadResult | undefined;

        service
          .upload(communityId, fleetId, file, 'Europe/London', null)
          .subscribe(result => (answered = result));

        httpMock.expectOne(importsUrl).flush(summary, { status, statusText });

        expect(answered).toEqual({ summary, repeated });
      },
    );

    it('asks for nothing when there is no token to ask with', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      let failure: Error | undefined;

      service
        .upload(communityId, fleetId, file, 'Europe/London', null)
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(importsUrl);
    });
  });

  describe('list', () => {
    const page = { items: [], total: 0, page: 2, pageSize: 20 };

    it('asks for a page of the collection', () => {
      let answered: RosterImportPage | undefined;

      service
        .list(communityId, fleetId, 2)
        .subscribe(result => (answered = result));

      const request = httpMock.expectOne(
        candidate => candidate.url === importsUrl,
      );

      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.has('pageSize')).toBe(false);
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush(page);

      expect(answered).toEqual(page);
    });

    it('asks for a page size when given one', () => {
      service.list(communityId, fleetId, 1, 50).subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === importsUrl,
      );

      expect(request.request.params.get('pageSize')).toBe('50');
      request.flush(page);
    });

    it('asks for nothing when there is no token to ask with', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      let failure: Error | undefined;

      service
        .list(communityId, fleetId, 1)
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(candidate => candidate.url === importsUrl);
    });
  });

  describe('detail', () => {
    const detailUrl = `${importsUrl}/import-1`;

    it('reads one import', () => {
      const detail = { id: 'import-1' } as RosterImportDetail;
      let answered: RosterImportDetail | undefined;

      service
        .detail(communityId, fleetId, 'import-1')
        .subscribe(result => (answered = result));

      const request = httpMock.expectOne(detailUrl);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush(detail);

      expect(answered).toEqual(detail);
    });

    it('asks for nothing when there is no token to ask with', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      let failure: Error | undefined;

      service
        .detail(communityId, fleetId, 'import-1')
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(detailUrl);
    });
  });
});
