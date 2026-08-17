import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ManagedStory, Story } from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StoryService } from './story.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';

describe('StoryService', () => {
  let service: StoryService;
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
        StoryService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(StoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    it('lists Stories without needing a token', async () => {
      const stories = firstValueFrom(service.getStories());

      const request = httpMock.expectOne(
        r => r.url === API_URLS.STORYTIME_STORIES,
      );
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ items: [], total: 0, page: 1, pageSize: 12 });

      await expect(stories).resolves.toBeDefined();
    });

    it('sends only the filters that are set', async () => {
      const stories = firstValueFrom(
        service.getStories({ languageCode: 'de', page: 2 }),
      );

      const request = httpMock.expectOne(
        r => r.url === API_URLS.STORYTIME_STORIES,
      );
      expect(request.request.params.get('languageCode')).toBe('de');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.has('contentRating')).toBe(false);
      request.flush({ items: [], total: 0, page: 2, pageSize: 12 });

      await stories;
    });

    // A blank filter is the same as no filter; sending it would narrow the
    // results to Stories with an empty value.
    it('omits blank and missing filters', async () => {
      const stories = firstValueFrom(
        service.getStories({
          languageCode: '',
          contentRating: undefined,
          ownerUserId: null as unknown as string,
        }),
      );

      const request = httpMock.expectOne(
        r => r.url === API_URLS.STORYTIME_STORIES,
      );
      expect(request.request.params.has('languageCode')).toBe(false);
      expect(request.request.params.has('contentRating')).toBe(false);
      expect(request.request.params.has('ownerUserId')).toBe(false);
      request.flush({ items: [], total: 0, page: 1, pageSize: 12 });

      await stories;
    });

    it('retrieves a Story by slug', async () => {
      const story = firstValueFrom(service.getStory('the-long-way-home'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/the-long-way-home`)
        .flush({ slug: 'the-long-way-home' } as Story);

      await expect(story).resolves.toBeDefined();
    });

    it('escapes a slug in the URL', async () => {
      const story = firstValueFrom(service.getStory('a b'));

      httpMock.expectOne(`${API_URLS.STORYTIME_STORIES}/a%20b`).flush({});

      await story;
    });
  });

  describe('managing', () => {
    it('lists the caller Stories with the token', async () => {
      const stories = firstValueFrom(service.getMyStories());

      const request = httpMock.expectOne(API_URLS.STORYTIME_MANAGE_STORIES);
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(stories).resolves.toEqual([]);
    });

    it('retrieves one of the caller Stories', async () => {
      const story = firstValueFrom(service.getMyStory(STORY_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}`)
        .flush({ id: STORY_ID } as ManagedStory);

      await expect(story).resolves.toBeDefined();
    });

    it('creates a Story', async () => {
      const created = firstValueFrom(service.createStory({ title: 'A Story' }));

      const request = httpMock.expectOne(API_URLS.STORYTIME_MANAGE_STORIES);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ title: 'A Story' });
      request.flush({ id: STORY_ID });

      await created;
    });

    it('updates a Story', async () => {
      const updated = firstValueFrom(
        service.updateStory(STORY_ID, { title: 'New', version: 3 }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ title: 'New', version: 3 });
      request.flush({ id: STORY_ID });

      await updated;
    });

    it.each([
      ['publishStory', 'publish'],
      ['unpublishStory', 'unpublish'],
      ['archiveStory', 'archive'],
      // Publishing is refused until this has been sent, so it travels with
      // the other actions rather than being tested apart from them.
      ['acceptContentPolicy', 'content-policy'],
    ])('performs the %s action', async (method, path) => {
      const call =
        service[
          method as
            | 'publishStory'
            | 'unpublishStory'
            | 'archiveStory'
            | 'acceptContentPolicy'
        ](STORY_ID);
      const result = firstValueFrom(call);

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/${path}`,
      );
      expect(request.request.method).toBe('POST');
      request.flush({ id: STORY_ID });

      await result;
    });

    it('reorders Stories', async () => {
      const reordered = firstValueFrom(service.reorderStories(['a', 'b']));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/reorder`,
      );
      expect(request.request.body).toEqual({ storyIds: ['a', 'b'] });
      request.flush([]);

      await reordered;
    });

    it('deletes a Story', async () => {
      const deleted = firstValueFrom(service.deleteStory(STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await deleted;
    });

    // Sending a request that is certain to be refused wastes a round trip and
    // produces a confusing 401 instead of a clear failure.
    it('fails fast when there is no token', async () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      await expect(firstValueFrom(service.getMyStories())).rejects.toThrow(
        'No token found',
      );
      httpMock.expectNone(API_URLS.STORYTIME_MANAGE_STORIES);
    });
  });
});
