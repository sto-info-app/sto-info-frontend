import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ArcService } from './arc.service';

const AUTH_HEADER = 'Bearer token-1';
const ARC_ID = 'arc-1';
const STORY_ID = 'story-1';
const MEMBERSHIP_ID = 'membership-1';

describe('ArcService', () => {
  let service: ArcService;
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
      providers: [ArcService, { provide: AuthService, useValue: authService }],
    });

    service = TestBed.inject(ArcService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    it('lists public Arcs without a token', async () => {
      const arcs = firstValueFrom(service.getArcs());

      const request = httpMock.expectOne(API_URLS.STORYTIME_ARCS);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(arcs).resolves.toEqual([]);
    });

    it('reads one Arc with its Stories', async () => {
      const arc = firstValueFrom(service.getArc('the-long-war'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ARCS}/the-long-war`)
        .flush({ arc: { slug: 'the-long-war' }, stories: [] });

      await expect(arc).resolves.toEqual({
        arc: { slug: 'the-long-war' },
        stories: [],
      });
    });

    it('encodes an awkward slug', async () => {
      const arc = firstValueFrom(service.getArc('a b'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ARCS}/a%20b`)
        .flush({ arc: {}, stories: [] });

      await expect(arc).resolves.toBeDefined();
    });
  });

  describe('curating', () => {
    it('lists the Arcs the caller curates', async () => {
      const arcs = firstValueFrom(service.getMyArcs());

      const request = httpMock.expectOne(API_URLS.STORYTIME_MANAGE_ARCS);
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(arcs).resolves.toEqual([]);
    });

    it('retrieves one Arc for editing', async () => {
      const arc = firstValueFrom(service.getMyArc(ARC_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}`)
        .flush({ id: ARC_ID });

      await expect(arc).resolves.toEqual({ id: ARC_ID });
    });

    it('creates an Arc', async () => {
      const arc = firstValueFrom(service.createArc({ title: 'The Long War' }));

      const request = httpMock.expectOne(API_URLS.STORYTIME_MANAGE_ARCS);
      expect(request.request.body).toEqual({ title: 'The Long War' });
      request.flush({ id: ARC_ID });

      await expect(arc).resolves.toBeDefined();
    });

    it('updates an Arc', async () => {
      const arc = firstValueFrom(
        service.updateArc(ARC_ID, { title: 'Renamed', version: 2 }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: ARC_ID });

      await expect(arc).resolves.toBeDefined();
    });

    it.each([
      ['publish', () => service.publishArc(ARC_ID)],
      ['unpublish', () => service.unpublishArc(ARC_ID)],
    ])('%ses an Arc', async (action, act) => {
      const arc = firstValueFrom(act());

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}/${action}`)
        .flush({ id: ARC_ID });

      await expect(arc).resolves.toBeDefined();
    });

    it('deletes an Arc', async () => {
      const removed = firstValueFrom(service.deleteArc(ARC_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await expect(removed).resolves.toBeNull();
    });
  });

  describe('membership', () => {
    it('lists everything in an Arc the caller curates', async () => {
      const stories = firstValueFrom(service.getArcStories(ARC_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}/stories`)
        .flush([]);

      await expect(stories).resolves.toEqual([]);
    });

    it('invites a Story', async () => {
      const invited = firstValueFrom(service.inviteStory(ARC_ID, STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}/stories`,
      );
      expect(request.request.body).toEqual({ storyId: STORY_ID });
      request.flush([]);

      await expect(invited).resolves.toEqual([]);
    });

    it('offers a Story to an Arc', async () => {
      const requested = firstValueFrom(service.requestToJoin(ARC_ID, STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/arcs/${ARC_ID}/request`,
      );
      expect(request.request.body).toEqual({ storyId: STORY_ID });
      request.flush([]);

      await expect(requested).resolves.toEqual([]);
    });

    it('reorders the reading order', async () => {
      const reordered = firstValueFrom(
        service.reorderArcStories(ARC_ID, ['b', 'a']),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${ARC_ID}/stories/reorder`,
      );
      expect(request.request.body).toEqual({ membershipIds: ['b', 'a'] });
      request.flush([]);

      await expect(reordered).resolves.toEqual([]);
    });

    it('lists what is waiting on the caller', async () => {
      const pending = firstValueFrom(service.getPendingMemberships());

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/pending`)
        .flush([]);

      await expect(pending).resolves.toEqual([]);
    });

    it.each([
      ['approve', () => service.approveMembership(MEMBERSHIP_ID)],
      ['decline', () => service.declineMembership(MEMBERSHIP_ID)],
      ['leave', () => service.leaveArc(MEMBERSHIP_ID)],
    ])('%ss a membership', async (action, act) => {
      const result = firstValueFrom(act());

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/${MEMBERSHIP_ID}/${action}`,
      );
      expect(request.request.method).toBe('POST');
      request.flush([]);

      await expect(result).resolves.toEqual([]);
    });
  });

  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each([
      ['getMyArcs', () => service.getMyArcs()],
      ['getMyArc', () => service.getMyArc(ARC_ID)],
      ['createArc', () => service.createArc({ title: 'X' })],
      ['updateArc', () => service.updateArc(ARC_ID, {})],
      ['publishArc', () => service.publishArc(ARC_ID)],
      ['unpublishArc', () => service.unpublishArc(ARC_ID)],
      ['deleteArc', () => service.deleteArc(ARC_ID)],
      ['getArcStories', () => service.getArcStories(ARC_ID)],
      ['inviteStory', () => service.inviteStory(ARC_ID, STORY_ID)],
      ['reorderArcStories', () => service.reorderArcStories(ARC_ID, ['a'])],
      ['getPendingMemberships', () => service.getPendingMemberships()],
      ['requestToJoin', () => service.requestToJoin(ARC_ID, STORY_ID)],
      ['approveMembership', () => service.approveMembership(MEMBERSHIP_ID)],
      ['declineMembership', () => service.declineMembership(MEMBERSHIP_ID)],
      ['leaveArc', () => service.leaveArc(MEMBERSHIP_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    // Reading a published Arc needs no account at all.
    it('still lists public Arcs', async () => {
      const arcs = firstValueFrom(service.getArcs());

      httpMock.expectOne(API_URLS.STORYTIME_ARCS).flush([]);

      await expect(arcs).resolves.toEqual([]);
    });
  });
});
