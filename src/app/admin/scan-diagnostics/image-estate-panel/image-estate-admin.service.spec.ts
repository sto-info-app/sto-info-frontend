import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { ImageEstateRunKind } from 'src/app/models/image-estate.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { ImageEstateAdminService } from './image-estate-admin.service';

const URL = API_URLS.IMAGE_ESTATE_ADMIN;

describe('ImageEstateAdminService (FC-040)', () => {
  let service: ImageEstateAdminService;
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

    service = TestBed.inject(ImageEstateAdminService);
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

  it('reads the status, takes an inventory and runs, pauses and resumes', () => {
    service.status().subscribe();
    expectOne('GET', URL).flush({});

    service.takeInventory().subscribe();
    expectOne('POST', `${URL}/inventory`).flush({});

    service.start(ImageEstateRunKind.COPY, 'Go private').subscribe();
    const start = expectOne('POST', `${URL}/runs`);

    expect(start.request.body).toEqual({
      kind: ImageEstateRunKind.COPY,
      reason: 'Go private',
    });
    start.flush({});

    service.pause('Checking').subscribe();
    const pause = expectOne('POST', `${URL}/runs/pause`);

    expect(pause.request.body).toEqual({ reason: 'Checking' });
    pause.flush({});

    service.resume('Checked').subscribe();
    const resume = expectOne('POST', `${URL}/runs/resume`);

    expect(resume.request.body).toEqual({ reason: 'Checked' });
    resume.flush({});
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.status())).rejects.toThrow(
      'No token found',
    );
  });
});
