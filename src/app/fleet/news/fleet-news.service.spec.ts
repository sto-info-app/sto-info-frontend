import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetNewsDraft } from 'src/app/models/fleet-news.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetNewsService } from './fleet-news.service';

const COMMUNITY = { communityId: 'community-1', fleetId: null };
const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const ARMADA = {
  communityId: 'community-1',
  fleetId: null,
  armadaId: 'armada-1',
};

const COMMUNITY_URL = `${API_URLS.FLEET_COMMUNITIES}/community-1/news`;
const FLEET_URL = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/news`;
const ARMADA_URL = `${API_URLS.FLEET_COMMUNITIES}/community-1/armadas/armada-1/news`;

const DRAFT: FleetNewsDraft = {
  title: 'Refit night',
  summary: null,
  body: 'Friday.',
  audience: 'PUBLIC',
};

describe('FleetNewsService', () => {
  let service: FleetNewsService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetNewsService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetNewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('list', () => {
    it('reads a Community’s own news, sending only what was asked', () => {
      service
        .list(COMMUNITY, { page: 2, pageSize: 10, q: '', status: undefined })
        .subscribe();

      const request = httpMock.expectOne(
        req => req.url === COMMUNITY_URL && req.method === 'GET',
      );

      expect(request.request.params.keys()).toEqual(['page', 'pageSize']);
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({ items: [] });
    });

    it('reads a Fleet’s drafts and searches, signed out too', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.list(FLEET, { q: 'refit', status: 'DRAFT' }).subscribe();

      const request = httpMock.expectOne(req => req.url === FLEET_URL);

      expect(request.request.params.get('q')).toBe('refit');
      expect(request.request.params.get('status')).toBe('DRAFT');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ items: [] });
    });

    it('reads an Armada’s news', () => {
      service.list(ARMADA, {}).subscribe();

      httpMock.expectOne(req => req.url === ARMADA_URL).flush({ items: [] });
    });
  });

  describe('read', () => {
    it('reads a post by its address, with the token when signed in', () => {
      service.read(FLEET, 'refit night').subscribe();

      const request = httpMock.expectOne(`${FLEET_URL}/refit%20night`);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({});
    });

    it('reads a post signed out', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.read(COMMUNITY, 'news-1').subscribe();

      const request = httpMock.expectOne(`${COMMUNITY_URL}/news-1`);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });
  });

  describe('writing', () => {
    it('writes a post', () => {
      service.create(FLEET, DRAFT).subscribe();

      const request = httpMock.expectOne(FLEET_URL);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(DRAFT);
      request.flush({});
    });

    it('changes a post', () => {
      service.update(ARMADA, 'post-1', DRAFT).subscribe();

      const request = httpMock.expectOne(`${ARMADA_URL}/post-1`);

      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual(DRAFT);
      request.flush({});
    });

    it('publishes and unpublishes a post', () => {
      service.publish(COMMUNITY, 'post-1').subscribe();
      service.unpublish(COMMUNITY, 'post-1').subscribe();

      for (const action of ['publish', 'unpublish']) {
        const request = httpMock.expectOne(`${COMMUNITY_URL}/post-1/${action}`);

        expect(request.request.method).toBe('POST');
        request.flush({});
      }
    });

    it('deletes a post', () => {
      service.remove(FLEET, 'post-1').subscribe();

      const request = httpMock.expectOne(`${FLEET_URL}/post-1`);

      expect(request.request.method).toBe('DELETE');
      request.flush(null);
    });

    it('refuses without a token', done => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.create(FLEET, DRAFT).subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('No token found');
          httpMock.expectNone(FLEET_URL);
          done();
        },
      });
    });
  });

  describe('as a site administrator', () => {
    it('unpublishes a post', () => {
      service.unpublishAsSiteAdmin('post-1').subscribe();

      const request = httpMock.expectOne(
        `${API_URLS.FLEET_NEWS_ADMIN}/post-1/unpublish`,
      );

      expect(request.request.method).toBe('POST');
      request.flush(null);
    });

    it('deletes a post', () => {
      service.removeAsSiteAdmin('post-1').subscribe();

      const request = httpMock.expectOne(`${API_URLS.FLEET_NEWS_ADMIN}/post-1`);

      expect(request.request.method).toBe('DELETE');
      request.flush(null);
    });
  });
});
