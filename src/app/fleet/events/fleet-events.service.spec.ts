import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetEventsService } from './fleet-events.service';

const COMMUNITY = `${API_URLS.FLEET_COMMUNITIES}/community-1`;
const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const EVENTS = `${COMMUNITY}/fleets/fleet-1/events`;
const OCCURRENCE = `${EVENTS}/event-1/occurrences/occurrence-1`;
const DEFINITION = {
  title: 'Refit night',
  audience: 'PUBLIC' as const,
  recurrence: 'NONE' as const,
  startDate: '2026-10-02',
  startTime: '20:00',
  durationMinutes: 120,
};

describe('FleetEventsService', () => {
  let service: FleetEventsService;
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
        FleetEventsService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetEventsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it.each([
    [
      'a Community’s',
      { communityId: 'community-1', fleetId: null },
      `${COMMUNITY}/events`,
    ],
    ['a Fleet’s', FLEET, EVENTS],
    [
      'an Armada’s',
      { communityId: 'community-1', fleetId: null, armadaId: 'armada-1' },
      `${COMMUNITY}/armadas/armada-1/events`,
    ],
  ])('reads %s calendar, signed in or not', (_scope, target, url) => {
    service.calendar(target, 'from', 'to').subscribe();

    const request = httpMock.expectOne(req => req.url === url);

    expect(request.request.params.get('from')).toBe('from');
    expect(request.request.params.get('to')).toBe('to');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({});
  });

  it('reads a calendar, an event and an occurrence signed out', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.calendar(FLEET, 'from', 'to').subscribe();
    httpMock.expectOne(req => req.url === EVENTS).flush({});
    service.detail(FLEET, 'event-1').subscribe();
    service.occurrence(FLEET, 'event-1', 'occurrence-1').subscribe();

    httpMock.expectOne(`${EVENTS}/event-1`).flush({});

    const occurrence = httpMock.expectOne(OCCURRENCE);

    expect(occurrence.request.headers.has('Authorization')).toBe(false);
    occurrence.flush({});
  });

  it.each<
    [
      string,
      (s: FleetEventsService) => Observable<unknown>,
      string,
      string,
      unknown,
    ]
  >([
    [
      'reads the reader’s own',
      s => s.mine(),
      'GET',
      `${API_URLS.FLEET_EVENTS}/mine`,
      null,
    ],
    [
      'previews',
      s => s.preview(FLEET, DEFINITION),
      'POST',
      `${EVENTS}/preview`,
      DEFINITION,
    ],
    ['creates', s => s.create(FLEET, DEFINITION), 'POST', EVENTS, DEFINITION],
    [
      'changes',
      s => s.update(FLEET, 'event-1', DEFINITION),
      'PUT',
      `${EVENTS}/event-1`,
      DEFINITION,
    ],
    [
      'cancels',
      s => s.cancel(FLEET, 'event-1'),
      'POST',
      `${EVENTS}/event-1/cancel`,
      {},
    ],
    [
      'reads the change log of',
      s => s.history(FLEET, 'event-1'),
      'GET',
      `${EVENTS}/event-1/history`,
      null,
    ],
    [
      'asks to be reminded of',
      s => s.remind(FLEET, 'event-1', [60]),
      'PUT',
      `${EVENTS}/event-1/reminders`,
      { leadMinutes: [60] },
    ],
    [
      'stops reminding of',
      s => s.stopReminding(FLEET, 'event-1'),
      'DELETE',
      `${EVENTS}/event-1/reminders`,
      null,
    ],
    [
      'cancels an occurrence of',
      s => s.cancelOccurrence(FLEET, 'event-1', 'occurrence-1'),
      'POST',
      `${OCCURRENCE}/cancel`,
      {},
    ],
    [
      'moves an occurrence of',
      s =>
        s.moveOccurrence(
          FLEET,
          'event-1',
          'occurrence-1',
          '2026-10-03',
          '19:30',
        ),
      'POST',
      `${OCCURRENCE}/move`,
      { date: '2026-10-03', time: '19:30' },
    ],
    [
      'answers an occurrence of',
      s => s.answer(FLEET, 'event-1', 'occurrence-1', 'GOING', 'character-1'),
      'PUT',
      `${OCCURRENCE}/rsvp`,
      { response: 'GOING', characterId: 'character-1' },
    ],
    [
      'takes an answer back from',
      s => s.withdraw(FLEET, 'event-1', 'occurrence-1'),
      'DELETE',
      `${OCCURRENCE}/rsvp`,
      null,
    ],
    [
      'reads the attendance sheet of',
      s => s.attendance(FLEET, 'event-1', 'occurrence-1'),
      'GET',
      `${OCCURRENCE}/attendance`,
      null,
    ],
    [
      'records attendance at',
      s => s.recordAttendance(FLEET, 'event-1', 'occurrence-1', 'user-1', true),
      'PUT',
      `${OCCURRENCE}/attendance`,
      { userId: 'user-1', attended: true },
    ],
  ])('%s an event with the token', (_label, call, method, url, body) => {
    call(service).subscribe();

    const request = httpMock.expectOne(url);

    expect(request.request.method).toBe(method);
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush(null);
  });

  it('refuses a change without a token', done => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.cancel(FLEET, 'event-1').subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('No token found');
        done();
      },
    });
  });
});
