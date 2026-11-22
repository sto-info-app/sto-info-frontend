import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { PublicationPause } from 'src/app/models/scan-diagnostics.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { PublicationPauseAdminService } from './publication-pause-admin.service';

const URL = API_URLS.FILE_PUBLICATION_ADMIN;

const RUNNING: PublicationPause = {
  paused: false,
  pausedAt: null,
  pausedByUserId: null,
  pausedByUsername: null,
  queuePaused: false,
  held: 0,
};

describe('PublicationPauseAdminService (FC-042)', () => {
  let service: PublicationPauseAdminService;
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

    service = TestBed.inject(PublicationPauseAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the switch with the access token', async () => {
    const answer = firstValueFrom(service.read());
    const request = httpMock.expectOne(URL);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush(RUNNING);

    await expect(answer).resolves.toEqual(RUNNING);
  });

  it.each(['pause', 'resume'] as const)('%ss it with a reason', action => {
    service.set(action, 'Checking a bad batch').subscribe();
    const request = httpMock.expectOne(`${URL}/${action}`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Checking a bad batch' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush(RUNNING);
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.read())).rejects.toThrow(
      'No token found',
    );
  });
});
