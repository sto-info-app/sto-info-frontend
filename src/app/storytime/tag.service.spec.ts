import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { StorytimeTagCategory } from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { TagService } from './tag.service';

const AUTH_HEADER = 'Bearer token-1';
const TAG_ID = 'tag-1';
const STORY_ID = 'story-1';
const ARC_ID = 'arc-1';

describe('TagService', () => {
  let service: TagService;
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
      providers: [TagService, { provide: AuthService, useValue: authService }],
    });

    service = TestBed.inject(TagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // A tag is a filter link, and somebody following one has to see what it
  // means whether or not they have an account.
  it('reads the vocabulary without a token', async () => {
    const tags = firstValueFrom(service.getTags());

    const request = httpMock.expectOne(r => r.url === API_URLS.STORYTIME_TAGS);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);

    await expect(tags).resolves.toEqual([]);
  });

  it('reads one category', async () => {
    const tags = firstValueFrom(service.getTags(StorytimeTagCategory.GENRE));

    const request = httpMock.expectOne(
      r =>
        r.url === API_URLS.STORYTIME_TAGS &&
        r.params.get('category') === StorytimeTagCategory.GENRE,
    );
    request.flush([]);

    await expect(tags).resolves.toEqual([]);
  });

  it.each([
    [
      'a Story',
      () => service.getStoryTags(STORY_ID),
      `${API_URLS.STORYTIME_STORIES}/${STORY_ID}/tags`,
    ],
    [
      'an Arc',
      () => service.getArcTags(ARC_ID),
      `${API_URLS.STORYTIME_ARCS}/${ARC_ID}/tags`,
    ],
  ])('reads the tags on %s', async (_name, act, url) => {
    const tags = firstValueFrom(act());

    httpMock.expectOne(url).flush([]);

    await expect(tags).resolves.toEqual([]);
  });

  // Replacing the whole set is what the API does, and a half-applied set of
  // tags would be worse than none.
  it('replaces the tags on a Story', async () => {
    const tags = firstValueFrom(service.setStoryTags(STORY_ID, [TAG_ID]));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/tags`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ tagIds: [TAG_ID] });
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush([]);

    await expect(tags).resolves.toEqual([]);
  });

  it('replaces the tags on an Arc', async () => {
    const tags = firstValueFrom(service.setArcTags(ARC_ID, [TAG_ID]));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}/tags`,
    );
    expect(request.request.method).toBe('PUT');
    request.flush([]);

    await expect(tags).resolves.toEqual([]);
  });

  it('adds a tag to the vocabulary', async () => {
    const tag = firstValueFrom(
      service.createTag({
        name: 'Klingon',
        category: StorytimeTagCategory.FACTION,
      }),
    );

    const request = httpMock.expectOne(API_URLS.STORYTIME_ADMIN_TAGS);
    expect(request.request.method).toBe('POST');
    request.flush({ id: TAG_ID });

    await expect(tag).resolves.toBeDefined();
  });

  it('changes a tag', async () => {
    const tag = firstValueFrom(service.updateTag(TAG_ID, { name: 'Klingon' }));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_ADMIN_TAGS}/${TAG_ID}`,
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: TAG_ID });

    await expect(tag).resolves.toBeDefined();
  });

  it('removes a tag', async () => {
    const removed = firstValueFrom(service.deleteTag(TAG_ID));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_ADMIN_TAGS}/${TAG_ID}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(removed).resolves.toBeNull();
  });

  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each([
      ['setStoryTags', () => service.setStoryTags(STORY_ID, [])],
      ['setArcTags', () => service.setArcTags(ARC_ID, [])],
      ['createTag', () => service.createTag({ name: 'X' })],
      ['updateTag', () => service.updateTag(TAG_ID, {})],
      ['deleteTag', () => service.deleteTag(TAG_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    it('still reads the vocabulary', async () => {
      const tags = firstValueFrom(service.getTags());

      httpMock.expectOne(r => r.url === API_URLS.STORYTIME_TAGS).flush([]);

      await expect(tags).resolves.toEqual([]);
    });
  });
});
