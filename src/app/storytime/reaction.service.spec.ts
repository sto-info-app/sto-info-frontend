import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReactionSummary,
  StorytimeReaction,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ReactionService } from './reaction.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';

const SUMMARY: ReactionSummary = {
  targetId: STORY_ID,
  upVotes: 3,
  downVotes: 1,
  rating: 2,
  mine: StorytimeReaction.THUMBS_UP,
};

describe('ReactionService', () => {
  let service: ReactionService;
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
        ReactionService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ReactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('reads how a thing stands', async () => {
    const summary = firstValueFrom(
      service.getSummary(StorytimeTargetType.STORY, STORY_ID),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_REACTIONS}/story/${STORY_ID}`,
    );
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush(SUMMARY);

    await expect(summary).resolves.toEqual(SUMMARY);
  });

  // A signed-out reader sees the same rating as everybody else; there is just
  // nothing of their own in it.
  it('reads a summary without a token', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    const summary = firstValueFrom(
      service.getSummary(StorytimeTargetType.STORY, STORY_ID),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_REACTIONS}/story/${STORY_ID}`,
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ...SUMMARY, mine: null });

    await expect(summary).resolves.toEqual({ ...SUMMARY, mine: null });
  });

  it('records what the reader thinks', async () => {
    const summary = firstValueFrom(
      service.react(
        StorytimeTargetType.CHAPTER,
        'chapter-1',
        StorytimeReaction.THUMBS_UP,
      ),
    );

    const request = httpMock.expectOne(API_URLS.STORYTIME_REACTIONS);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      targetType: StorytimeTargetType.CHAPTER,
      targetId: 'chapter-1',
      reaction: StorytimeReaction.THUMBS_UP,
    });
    request.flush(SUMMARY);

    await expect(summary).resolves.toEqual(SUMMARY);
  });

  it('takes back what the reader left', async () => {
    const summary = firstValueFrom(
      service.removeReaction(StorytimeTargetType.STORY, STORY_ID),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_REACTIONS}/story/${STORY_ID}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush({ ...SUMMARY, mine: null });

    await expect(summary).resolves.toEqual({ ...SUMMARY, mine: null });
  });

  it.each([
    [
      'reacting',
      () =>
        service.react(
          StorytimeTargetType.STORY,
          STORY_ID,
          StorytimeReaction.THUMBS_DOWN,
        ),
    ],
    [
      'taking a reaction back',
      () => service.removeReaction(StorytimeTargetType.STORY, STORY_ID),
    ],
  ])('fails %s without a token', async (_name, act) => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(act())).rejects.toThrow('No token found');
  });
});
