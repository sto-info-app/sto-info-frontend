import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { CommunitySubscriptionService } from './community-subscription.service';

describe('CommunitySubscriptionService', () => {
  let service: CommunitySubscriptionService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const communityId = 'community-1';
  const followUrl = `${API_URLS.FLEET_COMMUNITIES}/${communityId}/follow`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CommunitySubscriptionService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(CommunitySubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * No body worth sending. Following names no options: who is following is
   * the token, and what they are following is the address.
   */
  it('follows with an empty body', () => {
    service.follow(communityId).subscribe();

    const request = httpMock.expectOne(followUrl);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ isFollowing: true, followerCount: 1 });
  });

  it('stops following at the same address', () => {
    service.unfollow(communityId).subscribe();

    const request = httpMock.expectOne(followUrl);

    expect(request.request.method).toBe('DELETE');
    request.flush({ isFollowing: false, followerCount: 0 });
  });

  it('reads what the caller follows', () => {
    service.listFollowed().subscribe();

    const request = httpMock.expectOne(
      `${API_URLS.FLEET_COMMUNITIES}/followed`,
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('carries the caller’s token', () => {
    service.follow(communityId).subscribe();

    const request = httpMock.expectOne(followUrl);

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({ isFollowing: true, followerCount: 1 });
  });

  /**
   * Signed out, the request goes anyway and the server answers 401.
   * Inventing a client-side refusal would be a second place for the rule to
   * live.
   */
  it('sends the request even with no token to carry', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.follow(communityId).subscribe();

    const request = httpMock.expectOne(followUrl);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ isFollowing: true, followerCount: 1 });
  });
});
