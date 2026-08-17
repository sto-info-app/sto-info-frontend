import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FeedEntry,
  FollowTargetKind,
  StorytimeActivityType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { FollowService } from './follow.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';

const ENTRY: FeedEntry = {
  id: 'item-1',
  activityType: StorytimeActivityType.STORY_PUBLISHED,
  actorUserId: 'writer-1',
  storyTitle: 'The Long Patrol',
  storySlug: 'the-long-patrol',
  chapterTitle: null,
  chapterSlug: null,
  arcTitle: null,
  arcSlug: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

describe('FollowService', () => {
  let service: FollowService;
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
        FollowService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FollowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it.each([
    [
      'reads follow state',
      () => service.getFollowState(FollowTargetKind.STORY, STORY_ID),
      'GET',
    ],
    ['follows', () => service.follow(FollowTargetKind.STORY, STORY_ID), 'POST'],
    [
      'stops following',
      () => service.unfollow(FollowTargetKind.STORY, STORY_ID),
      'DELETE',
    ],
  ])('%s', async (_name, act, method) => {
    const state = firstValueFrom(act());

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_FOLLOWS}/${FollowTargetKind.STORY}/${STORY_ID}`,
    );
    expect(request.request.method).toBe(method);
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush({ isFollowing: true, followerCount: 4 });

    await expect(state).resolves.toEqual({
      isFollowing: true,
      followerCount: 4,
    });
  });

  it('follows a creator', async () => {
    const state = firstValueFrom(
      service.follow(FollowTargetKind.CREATOR, 'writer-1'),
    );

    httpMock
      .expectOne(
        `${API_URLS.STORYTIME_FOLLOWS}/${FollowTargetKind.CREATOR}/writer-1`,
      )
      .flush({ isFollowing: true, followerCount: 1 });

    await expect(state).resolves.toEqual({
      isFollowing: true,
      followerCount: 1,
    });
  });

  it('reads the first page of the feed by default', async () => {
    const feed = firstValueFrom(service.getFeed());

    const request = httpMock.expectOne(
      r => r.url === API_URLS.STORYTIME_FEED && r.params.get('page') === '1',
    );
    request.flush([ENTRY]);

    await expect(feed).resolves.toEqual([ENTRY]);
  });

  it('reads a later page', async () => {
    const feed = firstValueFrom(service.getFeed(3));

    httpMock
      .expectOne(
        r => r.url === API_URLS.STORYTIME_FEED && r.params.get('page') === '3',
      )
      .flush([]);

    await expect(feed).resolves.toEqual([]);
  });

  it('counts what is unread', async () => {
    const unread = firstValueFrom(service.getUnreadCount());

    httpMock
      .expectOne(`${API_URLS.STORYTIME_FEED}/unread`)
      .flush({ unread: 2 });

    await expect(unread).resolves.toEqual({ unread: 2 });
  });

  it('marks the feed as read', async () => {
    const marked = firstValueFrom(service.markFeedRead());

    const request = httpMock.expectOne(`${API_URLS.STORYTIME_FEED}/read`);
    expect(request.request.method).toBe('POST');
    request.flush(null);

    await expect(marked).resolves.toBeNull();
  });

  // A feed is one person's, so there is nothing to show without a token.
  it.each([
    [
      'reading follow state',
      () => service.getFollowState(FollowTargetKind.ARC, 'arc-1'),
    ],
    ['following', () => service.follow(FollowTargetKind.ARC, 'arc-1')],
    ['unfollowing', () => service.unfollow(FollowTargetKind.ARC, 'arc-1')],
    ['reading the feed', () => service.getFeed()],
    ['counting unread', () => service.getUnreadCount()],
    ['marking read', () => service.markFeedRead()],
  ])('fails %s without a token', async (_name, act) => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(act())).rejects.toThrow('No token found');
  });
});
