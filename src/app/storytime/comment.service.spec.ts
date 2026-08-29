import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  StorytimeComment,
  StorytimeCommentStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CommentService } from './comment.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const COMMENT_ID = 'comment-1';

const COMMENT: StorytimeComment = {
  id: COMMENT_ID,
  authorUserId: 'reader-1',
  parentCommentId: null,
  body: 'A fine chapter.',
  status: StorytimeCommentStatus.VISIBLE,
  editedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CommentService', () => {
  let service: CommentService;
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
        CommentService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(CommentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('reads a thread', async () => {
    const comments = firstValueFrom(
      service.getComments(StorytimeTargetType.STORY, STORY_ID),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_COMMENTS}/story/${STORY_ID}`,
    );
    request.flush([COMMENT]);

    await expect(comments).resolves.toEqual([COMMENT]);
  });

  // Reading a thread needs no account, so a signed-out reader gets one
  // without a token rather than an error.
  it('reads a thread without a token', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    const comments = firstValueFrom(
      service.getComments(StorytimeTargetType.ARC, 'arc-1'),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_COMMENTS}/arc/arc-1`,
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);

    await expect(comments).resolves.toEqual([]);
  });

  it('posts a comment', async () => {
    const posted = firstValueFrom(
      service.postComment({
        targetType: StorytimeTargetType.STORY,
        targetId: STORY_ID,
        body: 'A fine chapter.',
      }),
    );

    const request = httpMock.expectOne(API_URLS.STORYTIME_COMMENTS);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush(COMMENT);

    await expect(posted).resolves.toEqual(COMMENT);
  });

  it('posts a reply', async () => {
    const posted = firstValueFrom(
      service.postComment({
        targetType: StorytimeTargetType.STORY,
        targetId: STORY_ID,
        body: 'Agreed.',
        parentCommentId: COMMENT_ID,
      }),
    );

    const request = httpMock.expectOne(API_URLS.STORYTIME_COMMENTS);
    expect(request.request.body.parentCommentId).toBe(COMMENT_ID);
    request.flush(COMMENT);

    await expect(posted).resolves.toEqual(COMMENT);
  });

  it('changes what a comment says', async () => {
    const updated = firstValueFrom(
      service.updateComment(COMMENT_ID, 'A very fine chapter.'),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_COMMENTS}/${COMMENT_ID}`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ body: 'A very fine chapter.' });
    request.flush(COMMENT);

    await expect(updated).resolves.toEqual(COMMENT);
  });

  it('takes back a comment', async () => {
    const deleted = firstValueFrom(service.deleteComment(COMMENT_ID));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_COMMENTS}/${COMMENT_ID}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush({
      ...COMMENT,
      body: null,
      status: StorytimeCommentStatus.DELETED_BY_AUTHOR,
    });

    await expect(deleted).resolves.toEqual(
      expect.objectContaining({
        status: StorytimeCommentStatus.DELETED_BY_AUTHOR,
      }),
    );
  });

  it.each([
    ['hides', () => service.hideComment(COMMENT_ID), 'hide', {}],
    ['unhides', () => service.unhideComment(COMMENT_ID), 'unhide', {}],
    [
      'removes',
      () => service.removeComment(COMMENT_ID, 'Against the content policy.'),
      'remove',
      { message: 'Against the content policy.' },
    ],
  ])('%s a comment', async (_name, act, path, body) => {
    const result = firstValueFrom(act());

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_COMMENTS}/${COMMENT_ID}/${path}`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(COMMENT);

    await expect(result).resolves.toEqual(COMMENT);
  });

  it.each([
    [
      'posting',
      () =>
        service.postComment({
          targetType: StorytimeTargetType.STORY,
          targetId: STORY_ID,
          body: 'Hello.',
        }),
    ],
    ['editing', () => service.updateComment(COMMENT_ID, 'Hello.')],
    ['deleting', () => service.deleteComment(COMMENT_ID)],
    ['hiding', () => service.hideComment(COMMENT_ID)],
    ['unhiding', () => service.unhideComment(COMMENT_ID)],
    ['removing', () => service.removeComment(COMMENT_ID, 'No.')],
  ])('fails %s without a token', async (_name, act) => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(act())).rejects.toThrow('No token found');
  });
});
