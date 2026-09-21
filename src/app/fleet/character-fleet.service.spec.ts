import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetAudience } from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { CharacterFleetService } from './character-fleet.service';

describe('CharacterFleetService', () => {
  let service: CharacterFleetService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const characterId = 'character-1';
  const fleets = `${API_URLS.CHARACTER}/${characterId}/fleets`;
  const proposals = `${API_URLS.CHARACTER}/${characterId}/fleet-proposals`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CharacterFleetService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(CharacterFleetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('reads the history', () => {
    service.history(characterId).subscribe();

    const request = httpMock.expectOne(fleets);

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('records a Fleet', () => {
    service
      .record(characterId, {
        fleetId: 'fleet-1',
        validFrom: '2026-01-01T00:00:00.000Z',
        visibility: FleetAudience.PRIVATE,
      })
      .subscribe();

    const request = httpMock.expectOne(fleets);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fleetId: 'fleet-1',
      validFrom: '2026-01-01T00:00:00.000Z',
      visibility: FleetAudience.PRIVATE,
    });
    request.flush({});
  });

  /**
   * No instant is sent. Somebody recording a departure has almost always just
   * made it, and the server reads an absent one as now.
   */
  it('records a departure without a date', () => {
    service.leave(characterId).subscribe();

    const request = httpMock.expectOne(`${fleets}/current`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({});
  });

  it('changes who may see one entry', () => {
    service
      .setVisibility(characterId, 'membership-1', FleetAudience.FLEET_MEMBERS)
      .subscribe();

    const request = httpMock.expectOne(`${fleets}/membership-1/visibility`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      visibility: FleetAudience.FLEET_MEMBERS,
    });
    request.flush({});
  });

  /**
   * A DELETE, and deliberately not the same route as leaving. One says the
   * entry did not happen; the other says it ended.
   */
  it('withdraws an entry recorded in error', () => {
    service.retract(characterId, 'membership-1').subscribe();

    const request = httpMock.expectOne(`${fleets}/membership-1`);

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('reads the proposals', () => {
    service.proposals(characterId).subscribe();

    const request = httpMock.expectOne(proposals);

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('accepts one, saying who may see what it opens', () => {
    service
      .accept(characterId, 'proposal-1', FleetAudience.COMMUNITY)
      .subscribe();

    const request = httpMock.expectOne(`${proposals}/proposal-1/accept`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      visibility: FleetAudience.COMMUNITY,
    });
    request.flush({});
  });

  it('leaves the audience to the server when none is chosen', () => {
    service.accept(characterId, 'proposal-1').subscribe();

    const request = httpMock.expectOne(`${proposals}/proposal-1/accept`);

    expect(request.request.body).toEqual({});
    request.flush({});
  });

  it('declines one', () => {
    service.decline(characterId, 'proposal-1').subscribe();

    const request = httpMock.expectOne(`${proposals}/proposal-1/decline`);

    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('carries the caller’s token on every call', () => {
    service.history(characterId).subscribe();

    const request = httpMock.expectOne(fleets);

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush([]);
  });

  /**
   * Signed out, the request goes anyway and the server answers 401. Inventing
   * a client-side refusal would be a second place for the rule to live.
   */
  it('sends the request even with no token to carry', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.history(characterId).subscribe();

    const request = httpMock.expectOne(fleets);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });
});
