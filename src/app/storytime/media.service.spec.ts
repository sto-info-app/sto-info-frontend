import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { MediaService } from './media.service';

const AUTH_HEADER = 'Bearer token-1';
const CHAPTER_ID = 'chapter-1';
const MEDIA_ID = 'media-1';

describe('MediaService', () => {
  let service: MediaService;
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
        MediaService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(MediaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    // A video is only reachable through a Chapter that is itself readable,
    // and the URL mirrors that.
    it('lists a Chapter’s videos through its slugs', async () => {
      const media = firstValueFrom(
        service.getChapterMedia('a-story', 'chapter-one'),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_STORIES}/a-story/chapters/chapter-one/media`,
      );
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(media).resolves.toEqual([]);
    });

    it('encodes awkward slugs', async () => {
      const media = firstValueFrom(service.getChapterMedia('a b', 'c d'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a%20b/chapters/c%20d/media`)
        .flush([]);

      await expect(media).resolves.toEqual([]);
    });
  });

  describe('managing', () => {
    it('lists the videos on a Chapter the caller may edit', async () => {
      const media = firstValueFrom(service.getMyChapterMedia(CHAPTER_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/media`,
      );
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(media).resolves.toEqual([]);
    });

    it('adds a video from a share URL', async () => {
      const media = firstValueFrom(
        service.addMedia(CHAPTER_ID, {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          title: 'The escape',
        }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/media`,
      );
      expect(request.request.body).toEqual({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'The escape',
      });
      request.flush({ id: MEDIA_ID });

      await expect(media).resolves.toBeDefined();
    });

    it('changes how a video is presented', async () => {
      const media = firstValueFrom(
        service.updateMedia(MEDIA_ID, { caption: 'Shot on Risa.' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_MEDIA}/${MEDIA_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: MEDIA_ID });

      await expect(media).resolves.toBeDefined();
    });

    it('reorders a Chapter’s videos', async () => {
      const media = firstValueFrom(
        service.reorderMedia(CHAPTER_ID, ['b', 'a']),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/media/reorder`,
      );
      expect(request.request.body).toEqual({ mediaIds: ['b', 'a'] });
      request.flush([]);

      await expect(media).resolves.toEqual([]);
    });

    it('removes a video', async () => {
      const removed = firstValueFrom(service.removeMedia(MEDIA_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_MEDIA}/${MEDIA_ID}`,
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

    it.each<[string, () => Observable<unknown>]>([
      ['getMyChapterMedia', () => service.getMyChapterMedia(CHAPTER_ID)],
      [
        'addMedia',
        () => service.addMedia(CHAPTER_ID, { url: 'https://youtu.be/x' }),
      ],
      ['updateMedia', () => service.updateMedia(MEDIA_ID, {})],
      ['reorderMedia', () => service.reorderMedia(CHAPTER_ID, ['a'])],
      ['removeMedia', () => service.removeMedia(MEDIA_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    // Reading a published Chapter's videos needs no account at all.
    it('still lists a published Chapter’s videos', async () => {
      const media = firstValueFrom(
        service.getChapterMedia('a-story', 'chapter-one'),
      );

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_STORIES}/a-story/chapters/chapter-one/media`,
        )
        .flush([]);

      await expect(media).resolves.toEqual([]);
    });
  });
});
