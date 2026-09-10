import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ContentPreviewService } from './content-preview.service';

const AUTH_HEADER = 'Bearer token-1';

describe('ContentPreviewService', () => {
  let service: ContentPreviewService;
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
        ContentPreviewService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ContentPreviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('posts the source and unwraps the rendered HTML', async () => {
    const rendered = firstValueFrom(service.render('The **Enterprise**.'));

    const request = httpMock.expectOne(
      API_URLS.STORYTIME_MANAGE_CONTENT_PREVIEW,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      contentSource: 'The **Enterprise**.',
    });
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);

    request.flush({ html: '<p id="b1">The <strong>Enterprise</strong>.</p>' });

    await expect(rendered).resolves.toBe(
      '<p id="b1">The <strong>Enterprise</strong>.</p>',
    );
  });

  // The source travels in the body rather than the URL: a Chapter runs to a
  // hundred thousand characters, and a query string is the wrong place for it.
  it('sends the source in the body, never in the URL', async () => {
    const rendered = firstValueFrom(service.render('secret draft'));

    const request = httpMock.expectOne(
      API_URLS.STORYTIME_MANAGE_CONTENT_PREVIEW,
    );

    expect(request.request.urlWithParams).toBe(
      API_URLS.STORYTIME_MANAGE_CONTENT_PREVIEW,
    );

    request.flush({ html: '<p id="b1">secret draft</p>' });
    await rendered;
  });

  it('refuses to render without a token', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.render('anything'))).rejects.toThrow(
      'No token found',
    );
    httpMock.expectNone(() => true);
  });
});
