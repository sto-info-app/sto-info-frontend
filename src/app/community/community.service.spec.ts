import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CommunityService } from './community.service';
import {
  BlockedMember,
  CommunityMember,
  CommunitySummary,
  Friend,
  FriendRequest,
  FriendRequestDirection,
  PaginatedFriends,
} from './models/community.models';

const AUTH_HEADER = 'Bearer token-1';

const member: CommunityMember = {
  username: 'captain.picard',
  profilePicture100: null,
  profilePicture300: null,
  joinedAt: '2026-01-14T09:21:00.000Z',
  lastActiveAt: null,
  playingSince: null,
  publicAccountCount: 0,
  publicCharacterCount: 0,
  publiclyVisible: true,
};

const summary: CommunitySummary = {
  friendCount: 3,
  incomingRequestCount: 2,
  outgoingRequestCount: 1,
  blockedCount: 0,
};

const emptyPage: PaginatedFriends = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
};

describe('CommunityService', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CommunityService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(CommunityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * Puts the viewer in a signed-out state for the next call.
   */
  function signOut(): void {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSummary', () => {
    it('should request the summary with the access token', () => {
      service.getSummary().subscribe();

      const req = httpMock.expectOne(API_URLS.COMMUNITY_SUMMARY);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      req.flush(summary);
    });

    it('should push the counts onto the summary stream', async () => {
      service.getSummary().subscribe();
      httpMock.expectOne(API_URLS.COMMUNITY_SUMMARY).flush(summary);

      await expect(firstValueFrom(service.summary$)).resolves.toEqual(summary);
    });

    it('should start the summary stream at zero', async () => {
      await expect(firstValueFrom(service.summary$)).resolves.toEqual({
        friendCount: 0,
        incomingRequestCount: 0,
        outgoingRequestCount: 0,
        blockedCount: 0,
      });
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(firstValueFrom(service.getSummary())).rejects.toThrow(
        'No token found',
      );
    });
  });

  describe('getFriends', () => {
    it('should request the friends endpoint with no params by default', () => {
      service
        .getFriends()
        .subscribe(result => expect(result).toEqual(emptyPage));

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.COMMUNITY_FRIENDS && r.params.keys().length === 0,
      );
      expect(req.request.method).toBe('GET');
      req.flush(emptyPage);
    });

    it('should send every supplied query param', () => {
      service
        .getFriends({ search: 'picard', page: 2, pageSize: 24 })
        .subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.COMMUNITY_FRIENDS &&
          r.params.get('search') === 'picard' &&
          r.params.get('page') === '2' &&
          r.params.get('pageSize') === '24',
      );
      req.flush(emptyPage);
    });

    it('should omit falsy query params', () => {
      service.getFriends({ search: '', page: 0, pageSize: 0 }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.COMMUNITY_FRIENDS && r.params.keys().length === 0,
      );
      req.flush(emptyPage);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(firstValueFrom(service.getFriends())).rejects.toThrow(
        'No token found',
      );
    });
  });

  describe('removeFriend', () => {
    it('should delete the friendship', () => {
      service.removeFriend('friendship-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.COMMUNITY_FRIENDS}/friendship-1`,
      );
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      req.flush(null);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.removeFriend('friendship-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('getFriendRequests', () => {
    it('should request the direction asked for', () => {
      service.getFriendRequests(FriendRequestDirection.OUTGOING).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.COMMUNITY_FRIEND_REQUESTS &&
          r.params.get('direction') === 'OUTGOING',
      );
      expect(req.request.method).toBe('GET');
      req.flush([] as FriendRequest[]);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(
          service.getFriendRequests(FriendRequestDirection.INCOMING),
        ),
      ).rejects.toThrow('No token found');
    });
  });

  describe('sendFriendRequest', () => {
    it('should post the recipient username', () => {
      service.sendFriendRequest({ username: 'captain.picard' }).subscribe();

      const req = httpMock.expectOne(API_URLS.COMMUNITY_FRIEND_REQUESTS);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'captain.picard' });
      req.flush({ id: 'friendship-1', member } as unknown as FriendRequest);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.sendFriendRequest({ username: 'x' })),
      ).rejects.toThrow('No token found');
    });
  });

  describe('acceptFriendRequest', () => {
    it('should post to the accept endpoint', () => {
      service.acceptFriendRequest('friendship-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/friendship-1/accept`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 'friendship-1', member } as unknown as Friend);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.acceptFriendRequest('friendship-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('declineFriendRequest', () => {
    it('should post to the decline endpoint', () => {
      service.declineFriendRequest('friendship-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/friendship-1/decline`,
      );
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.declineFriendRequest('friendship-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('cancelFriendRequest', () => {
    it('should delete the pending request', () => {
      service.cancelFriendRequest('friendship-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/friendship-1`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.cancelFriendRequest('friendship-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('getBlockedMembers', () => {
    it('should request the blocks endpoint', () => {
      service.getBlockedMembers().subscribe();

      const req = httpMock.expectOne(API_URLS.COMMUNITY_BLOCKS);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      req.flush([] as BlockedMember[]);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(firstValueFrom(service.getBlockedMembers())).rejects.toThrow(
        'No token found',
      );
    });
  });

  describe('blockMember', () => {
    it('should post the target and the private note', () => {
      service
        .blockMember({ username: 'captain.picard', reason: 'Harassment' })
        .subscribe();

      const req = httpMock.expectOne(API_URLS.COMMUNITY_BLOCKS);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'captain.picard',
        reason: 'Harassment',
      });
      req.flush({ id: 'block-1', member } as unknown as BlockedMember);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.blockMember({ username: 'x' })),
      ).rejects.toThrow('No token found');
    });
  });

  describe('unblockMember', () => {
    it('should delete the block', () => {
      service.unblockMember('block-1').subscribe();

      const req = httpMock.expectOne(`${API_URLS.COMMUNITY_BLOCKS}/block-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.unblockMember('block-1')),
      ).rejects.toThrow('No token found');
    });
  });
});
