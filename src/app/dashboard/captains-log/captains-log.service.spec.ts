import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { LogEntryType } from 'src/app/models/captains-log.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { CaptainsLogService } from './captains-log.service';

describe('CaptainsLogService (sc-1450)', () => {
  let service: CaptainsLogService;
  let httpMock: HttpTestingController;
  let auth: jest.Mocked<Pick<AuthService, 'getHttpOptionsWithAccessToken'>>;

  beforeEach(() => {
    auth = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders().set('Authorization', 'Bearer token'),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    service = TestBed.inject(CaptainsLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the member’s own entries, sending only the query it was given', () => {
    service.list({ type: LogEntryType.PERSONAL, page: 2 }).subscribe();

    const req = httpMock.expectOne(
      request => request.url === API_URLS.CAPTAINS_LOG,
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('type')).toBe(LogEntryType.PERSONAL);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('pageSize')).toBeFalse();
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({ items: [], total: 0, page: 2, pageSize: 20 });

    service.list({ type: undefined }).subscribe();
    expect(
      httpMock
        .expectOne(request => request.url === API_URLS.CAPTAINS_LOG)
        .request.params.keys(),
    ).toEqual([]);
  });

  it('reads, writes, changes and deletes one entry', () => {
    const request = { type: LogEntryType.CAPTAIN, body: 'Engage.' };

    service.get('entry-1').subscribe();
    service.create(request).subscribe();
    service.update('entry-1', { body: 'Make it so.' }).subscribe();
    service.delete('entry-1').subscribe();

    const entryUrl = `${API_URLS.CAPTAINS_LOG}/entry-1`;
    const reads = httpMock.match(entryUrl);

    expect(reads.map(req => req.request.method)).toEqual([
      'GET',
      'PATCH',
      'DELETE',
    ]);
    expect(reads[1].request.body).toEqual({ body: 'Make it so.' });

    const created = httpMock.expectOne(API_URLS.CAPTAINS_LOG);

    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(request);
  });

  it('sends a picture with its description, and takes one down', () => {
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    service.uploadPicture('entry-1', image, 'The bridge').subscribe();
    service.removePicture('entry-1').subscribe();

    const [upload, removal] = httpMock.match(
      `${API_URLS.CAPTAINS_LOG}/entry-1/picture`,
    );
    const body = upload.request.body as FormData;

    expect(upload.request.method).toBe('POST');
    expect(body.get('altText')).toBe('The bridge');
    expect((body.get('image') as File).name).toBe('picture.jpeg');
    expect(removal.request.method).toBe('DELETE');
  });

  it('reads a profile’s Captain’s entries signed in or out', () => {
    service.listPublic('captain picard', 3).subscribe();

    const signedIn = httpMock.expectOne(
      request =>
        request.url === `${API_URLS.CAPTAINS_LOG_PUBLIC}/captain%20picard`,
    );

    expect(signedIn.request.params.get('page')).toBe('3');
    expect(signedIn.request.headers.get('Authorization')).toBe('Bearer token');

    auth.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.listPublic('picard').subscribe();

    const signedOut = httpMock.expectOne(
      request => request.url === `${API_URLS.CAPTAINS_LOG_PUBLIC}/picard`,
    );

    expect(signedOut.request.params.get('page')).toBe('1');
    expect(signedOut.request.headers.has('Authorization')).toBeFalse();
  });

  it('reads and removes an entry for a site admin', () => {
    service.getForAdmin('entry-1').subscribe();
    service.removeForAdmin('entry-1', 'Spoilers').subscribe();

    expect(
      httpMock.expectOne(`${API_URLS.CAPTAINS_LOG_ADMIN}/entry-1`).request
        .method,
    ).toBe('GET');

    const removal = httpMock.expectOne(
      `${API_URLS.CAPTAINS_LOG_ADMIN}/entry-1/remove`,
    );

    expect(removal.request.method).toBe('POST');
    expect(removal.request.body).toEqual({ reason: 'Spoilers' });
  });

  it.each<[string, () => Observable<unknown>]>([
    ['list', () => service.list()],
    ['get', () => service.get('entry-1')],
    ['create', () => service.create({ type: LogEntryType.CAPTAIN, body: 'x' })],
    ['update', () => service.update('entry-1', {})],
    ['delete', () => service.delete('entry-1')],
    ['uploadPicture', () => service.uploadPicture('entry-1', new Blob(), 'x')],
    ['removePicture', () => service.removePicture('entry-1')],
    ['getForAdmin', () => service.getForAdmin('entry-1')],
    ['removeForAdmin', () => service.removeForAdmin('entry-1', 'x')],
  ])('fails %s at once when signed out', (_name, call) => {
    auth.getHttpOptionsWithAccessToken.mockReturnValue(null);

    let failure: unknown;

    call().subscribe({ error: error => (failure = error) });

    expect((failure as Error).message).toBe('No token found');
    httpMock.expectNone(() => true);
  });
});
