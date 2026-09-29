import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FLEET_FEATURES_DISABLED,
  FleetFeatureState,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import {
  CHAT_PRESENCE_POLL_MS,
  ChatPresenceService,
} from './chat-presence.service';

describe('ChatPresenceService', () => {
  let service: ChatPresenceService;
  let httpMock: HttpTestingController;
  let auth: { getHttpOptionsWithAccessToken: jest.Mock };
  let features$: BehaviorSubject<FleetFeatureState>;

  beforeEach(() => {
    auth = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };
    features$ = new BehaviorSubject<FleetFeatureState>({
      ...FLEET_FEATURES_DISABLED,
      chatEnabled: true,
    });
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: auth },
        {
          provide: FleetConfigurationService,
          useValue: { getFeatures: () => features$ },
        },
      ],
    });
    service = TestBed.inject(ChatPresenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
  });

  /**
   * Answers the next presence request.
   *
   * @param online - Who is online.
   * @returns The usernames asked about.
   */
  const answer = (online: string[]): string | null => {
    const request = httpMock.expectOne(
      req => req.url === `${API_URLS.CHAT}/presence`,
    );
    const asked = request.request.params.get('usernames');

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush(
      (asked ?? '')
        .split(',')
        .map(username => ({ username, online: online.includes(username) })),
    );

    return asked;
  };

  it('asks once for each name, fifty at most, and gives who is online', () => {
    const names = Array.from({ length: 55 }, (_, index) => `user${index}`);
    let online: ReadonlySet<string> | undefined;

    service.online([...names, 'user0']).subscribe(each => (online = each));

    expect(answer(['user1'])?.split(',')).toHaveLength(50);
    expect(online).toEqual(new Set(['user1']));
  });

  it('asks nothing for nobody, or signed out', () => {
    let answers = 0;

    service.online([]).subscribe(() => answers++);
    auth.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.online(['Kira']).subscribe(() => answers++);

    expect(answers).toBe(2);
  });

  it('says nobody is online when it cannot tell', () => {
    let online: ReadonlySet<string> | undefined;

    service.online(['Kira']).subscribe(each => (online = each));
    httpMock
      .expectOne(req => req.url === `${API_URLS.CHAT}/presence`)
      .flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(online).toEqual(new Set());
  });

  it('reads again every minute while watched, and not at all while chat is off', () => {
    jest.useFakeTimers();

    const seen: ReadonlySet<string>[] = [];
    const watching = service.watch(['Kira']).subscribe(each => seen.push(each));

    jest.advanceTimersByTime(0);
    answer(['Kira']);
    jest.advanceTimersByTime(CHAT_PRESENCE_POLL_MS);
    answer([]);

    features$.next(FLEET_FEATURES_DISABLED);
    jest.advanceTimersByTime(CHAT_PRESENCE_POLL_MS);
    watching.unsubscribe();

    expect(seen).toEqual([new Set(['Kira']), new Set(), new Set()]);
  });
});
