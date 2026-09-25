import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetAudience } from 'src/app/models/fleet.models';
import { FleetReport } from 'src/app/models/fleet-report.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetReportService } from './fleet-report.service';

describe('FleetReportService', () => {
  let service: FleetReportService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const reportsUrl = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/reports`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetReportService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('visible', () => {
    it('asks which reports the viewer may see, signed when they are', () => {
      let answered: unknown;

      service
        .visible('community-1', 'fleet-1')
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(reportsUrl);

      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush([]);
      expect(answered).toEqual([]);
    });

    // A report can be public, so a signed-out viewer still asks.
    it('asks unsigned for a signed-out viewer', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.visible('community-1', 'fleet-1').subscribe();

      const request = httpMock.expectOne(reportsUrl);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
    });
  });

  describe('report', () => {
    it('asks for a report by its lower-case name, over the span given', () => {
      service
        .report('community-1', 'fleet-1', FleetReport.CONTRIBUTION, {
          from: '2024-01-01T00:00:00.000Z',
          at: 'import-2',
        })
        .subscribe();

      const request = httpMock.expectOne(
        r => r.url === `${reportsUrl}/contribution`,
      );

      expect(request.request.params.get('from')).toBe(
        '2024-01-01T00:00:00.000Z',
      );
      expect(request.request.params.get('at')).toBe('import-2');
      expect(request.request.params.has('to')).toBe(false);
      request.flush({});
    });
  });

  describe('csv', () => {
    it('downloads a report as a file', () => {
      let answered: Blob | undefined;

      service
        .csv('community-1', 'fleet-1', FleetReport.GROWTH, {})
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(
        r => r.url === `${reportsUrl}/growth/csv`,
      );

      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['# Growth']));
      expect(answered).toBeInstanceOf(Blob);
    });
  });

  describe('audiences', () => {
    it('reads every report’s audience', () => {
      service.audiences('community-1', 'fleet-1').subscribe();

      httpMock.expectOne(`${reportsUrl}/audiences`).flush({});
    });

    it('changes one report’s audience', () => {
      service
        .setAudience(
          'community-1',
          'fleet-1',
          FleetReport.TENURE,
          FleetAudience.PUBLIC,
        )
        .subscribe();

      const request = httpMock.expectOne(`${reportsUrl}/tenure/audience`);

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ audience: FleetAudience.PUBLIC });
      request.flush({});
    });

    it.each(['audiences', 'setAudience'] as const)(
      'fails %s without asking when nobody is signed in',
      method => {
        authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
        let failure: Error | undefined;

        (method === 'audiences'
          ? service.audiences('community-1', 'fleet-1')
          : service.setAudience(
              'community-1',
              'fleet-1',
              FleetReport.GROWTH,
              FleetAudience.PRIVATE,
            )
        ).subscribe({ error: (error: Error) => (failure = error) });

        expect(failure?.message).toBe('No token found');
      },
    );
  });
});
