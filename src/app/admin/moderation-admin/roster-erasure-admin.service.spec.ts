import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { RosterErasureAdminService } from './roster-erasure-admin.service';

const URL = API_URLS.ROSTER_ERASURES_ADMIN;

describe('RosterErasureAdminService (FC-038)', () => {
  let service: RosterErasureAdminService;
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
      providers: [{ provide: AuthService, useValue: authService }],
    });

    service = TestBed.inject(RosterErasureAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Expects one request, with the token.
   *
   * @param method - Its method.
   * @param url - Its URL.
   * @returns It.
   */
  const expectOne = (method: string, url: string) => {
    const request = httpMock.expectOne(
      req => req.method === method && req.url === url,
    );

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');

    return request;
  };

  it('lists, previews and erases', () => {
    const target = { characterName: 'Kira', accountHandle: '@nerys' };

    service.list().subscribe();
    expectOne('GET', URL).flush([]);

    service.preview(target).subscribe();
    expect(expectOne('POST', `${URL}/preview`).request.body).toEqual(target);

    service.erase({ ...target, reason: 'Verified in game' }).subscribe();
    expect(expectOne('POST', URL).request.body).toEqual({
      ...target,
      reason: 'Verified in game',
    });
  });

  it('fails without a token, sending nothing', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    const error = jest.fn();

    service.list().subscribe({ error });

    expect(error).toHaveBeenCalledWith(new Error('No token found'));
  });
});
