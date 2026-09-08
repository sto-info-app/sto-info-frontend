import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ReaderStoryStatus } from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ProgressService } from './progress.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const CHAPTER_ID = 'chapter-1';
const STORY_URL = `${API_URLS.STORYTIME_PROGRESS}/stories/${STORY_ID}`;
const CHAPTER_URL = `${API_URLS.STORYTIME_PROGRESS}/chapters/${CHAPTER_ID}`;

describe('ProgressService', () => {
  let service: ProgressService;
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
        ProgressService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('the reader library', () => {
    it('lists every Story the reader has progress on', async () => {
      const library = firstValueFrom(service.getLibrary());

      const request = httpMock.expectOne(API_URLS.STORYTIME_PROGRESS);
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(library).resolves.toEqual([]);
    });

    it('narrows the list to a status', async () => {
      const library = firstValueFrom(
        service.getLibrary(ReaderStoryStatus.ON_HOLD),
      );

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_PROGRESS}?status=${ReaderStoryStatus.ON_HOLD}`,
        )
        .flush([]);

      await expect(library).resolves.toEqual([]);
    });
  });

  describe('one Story', () => {
    it('reports progress', async () => {
      const progress = firstValueFrom(service.getStoryProgress(STORY_ID));

      httpMock.expectOne(STORY_URL).flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });

    it('sets a deliberate status', async () => {
      const progress = firstValueFrom(
        service.setStoryStatus(STORY_ID, ReaderStoryStatus.ABANDONED),
      );

      const request = httpMock.expectOne(STORY_URL);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({
        status: ReaderStoryStatus.ABANDONED,
      });
      request.flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });

    it('marks a whole Story read', async () => {
      const progress = firstValueFrom(service.completeStory(STORY_ID));

      httpMock.expectOne(`${STORY_URL}/complete`).flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });

    it('starts a Story again', async () => {
      const progress = firstValueFrom(service.resetStory(STORY_ID));

      httpMock.expectOne(`${STORY_URL}/reset`).flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });
  });

  describe('one Chapter', () => {
    it('reports where the reader left off', async () => {
      const progress = firstValueFrom(service.getChapterProgress(CHAPTER_ID));

      httpMock.expectOne(CHAPTER_URL).flush({ blockId: 'b9' });

      await expect(progress).resolves.toEqual({ blockId: 'b9' });
    });

    it('records a reported position', async () => {
      const progress = firstValueFrom(
        service.updateChapterProgress(CHAPTER_ID, {
          progressPercent: 42,
          blockId: 'b9',
        }),
      );

      const request = httpMock.expectOne(CHAPTER_URL);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({
        progressPercent: 42,
        blockId: 'b9',
      });
      request.flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });

    it('marks a Chapter read', async () => {
      const progress = firstValueFrom(service.setChapterRead(CHAPTER_ID, true));

      const request = httpMock.expectOne(`${CHAPTER_URL}/read`);
      expect(request.request.body).toEqual({ isRead: true });
      request.flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });

    it('marks a Chapter unread', async () => {
      const progress = firstValueFrom(
        service.setChapterRead(CHAPTER_ID, false),
      );

      const request = httpMock.expectOne(`${CHAPTER_URL}/read`);
      expect(request.request.body).toEqual({ isRead: false });
      request.flush({ storyId: STORY_ID });

      await expect(progress).resolves.toEqual({ storyId: STORY_ID });
    });
  });

  // Progress is personal and the server takes the reader from the token, so
  // there is nothing to ask for without one. Failing is honest; sending the
  // request anyway would only earn a 401.
  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each<[string, () => Observable<unknown>]>([
      ['getLibrary', () => service.getLibrary()],
      ['getStoryProgress', () => service.getStoryProgress(STORY_ID)],
      ['getChapterProgress', () => service.getChapterProgress(CHAPTER_ID)],
      [
        'setStoryStatus',
        () => service.setStoryStatus(STORY_ID, ReaderStoryStatus.ON_HOLD),
      ],
      [
        'updateChapterProgress',
        () => service.updateChapterProgress(CHAPTER_ID, {}),
      ],
      ['setChapterRead', () => service.setChapterRead(CHAPTER_ID, true)],
      ['completeStory', () => service.completeStory(STORY_ID)],
      ['resetStory', () => service.resetStory(STORY_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });
  });
});
