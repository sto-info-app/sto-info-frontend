import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ChapterService } from './chapter.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const CHAPTER_ID = 'chapter-1';

describe('ChapterService', () => {
  let service: ChapterService;
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
        ChapterService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ChapterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    // A Chapter is only reachable through a Story that is itself readable,
    // and the URL mirrors that.
    it('lists Chapters through the Story slug', async () => {
      const chapters = firstValueFrom(service.getChapters('a-story'));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_STORIES}/a-story/chapters`,
      );
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(chapters).resolves.toEqual([]);
    });

    it('reads a Chapter with its navigation', async () => {
      const result = firstValueFrom(
        service.getChapter('a-story', 'chapter-one'),
      );

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a-story/chapters/chapter-one`)
        .flush({
          chapter: { slug: 'chapter-one' },
          previous: null,
          next: null,
        });

      await expect(result).resolves.toBeDefined();
    });

    it('escapes both slugs in the URL', async () => {
      const result = firstValueFrom(service.getChapter('a b', 'c d'));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_STORIES}/a%20b/chapters/c%20d`,
      );
      expect(request.request.method).toBe('GET');
      request.flush({});

      await result;
    });
  });

  describe('managing', () => {
    it('lists the Chapters of a Story with the token', async () => {
      const chapters = firstValueFrom(service.getMyChapters(STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/chapters`,
      );
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(chapters).resolves.toEqual([]);
    });

    it('retrieves a Chapter for editing', async () => {
      const chapter = firstValueFrom(service.getMyChapter(CHAPTER_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}`)
        .flush({ id: CHAPTER_ID });

      await expect(chapter).resolves.toEqual({ id: CHAPTER_ID });
    });

    it('creates a Chapter in a Story', async () => {
      const created = firstValueFrom(
        service.createChapter(STORY_ID, { title: 'Chapter One' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/chapters`,
      );
      expect(request.request.method).toBe('POST');
      request.flush({ id: CHAPTER_ID });

      await created;
    });

    it('updates a Chapter', async () => {
      const updated = firstValueFrom(
        service.updateChapter(CHAPTER_ID, { title: 'New', version: 2 }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ title: 'New', version: 2 });
      request.flush({ id: CHAPTER_ID });

      await updated;
    });

    it.each([
      ['publishChapter', 'publish'],
      ['unpublishChapter', 'unpublish'],
    ])('performs the %s action', async (method, path) => {
      const call =
        service[method as 'publishChapter' | 'unpublishChapter'](CHAPTER_ID);
      const result = firstValueFrom(call);

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/${path}`,
        )
        .flush({ id: CHAPTER_ID });

      await result;
    });

    // The server takes a UTC instant; sending a local-looking string would
    // publish at the wrong moment.
    it('schedules a Chapter as a UTC instant', async () => {
      const when = new Date('2030-01-01T09:00:00Z');
      const result = firstValueFrom(service.scheduleChapter(CHAPTER_ID, when));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/schedule`,
      );
      expect(request.request.body).toEqual({
        publishAt: '2030-01-01T09:00:00.000Z',
      });
      request.flush({ id: CHAPTER_ID });

      await result;
    });

    it('reorders Chapters', async () => {
      const result = firstValueFrom(
        service.reorderChapters(STORY_ID, ['a', 'b']),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/chapters/reorder`,
      );
      expect(request.request.body).toEqual({ chapterIds: ['a', 'b'] });
      request.flush([]);

      await result;
    });

    it('deletes a Chapter', async () => {
      const result = firstValueFrom(service.deleteChapter(CHAPTER_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await result;
    });

    it('fails fast when there is no token', async () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      await expect(
        firstValueFrom(service.getMyChapters(STORY_ID)),
      ).rejects.toThrow('No token found');
    });
  });
});
