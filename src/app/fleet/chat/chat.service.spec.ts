import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { ReportReason } from 'src/app/models/moderation.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { ChatService } from './chat.service';

const COMMUNITY = `${API_URLS.FLEET_COMMUNITIES}/community-1`;
const INPUT = { name: 'Away team', readRole: 'MEMBER' as const };

describe('ChatService', () => {
  let service: ChatService;
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

    service = TestBed.inject(ChatService);
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

  it('lists the reader’s channels and conversations', () => {
    service.channels().subscribe();
    expectOne('GET', `${API_URLS.CHAT}/channels`).flush([]);

    service.conversations().subscribe();
    expectOne('GET', `${API_URLS.CHAT}/direct`).flush([]);
  });

  it('opens a conversation with a friend, or by the friendship', () => {
    service.open({ userId: 'friend-1' }).subscribe();
    expect(expectOne('POST', `${API_URLS.CHAT}/direct`).request.body).toEqual({
      userId: 'friend-1',
    });

    service.open({ friendshipId: 'friendship-1' }).subscribe();

    const request = expectOne('POST', `${API_URLS.CHAT}/direct`);

    expect(request.request.body).toEqual({ friendshipId: 'friendship-1' });
    request.flush({});
  });

  it.each([
    [
      'a channel',
      { channelId: 'channel-1' },
      `${API_URLS.CHAT}/channels/channel-1/messages`,
    ],
    [
      'a conversation',
      { conversationId: 'talk-1' },
      `${API_URLS.CHAT}/direct/talk-1/messages`,
    ],
  ])('reads older messages in %s', (_label, place, url) => {
    service.older(place, 'cursor').subscribe();

    const request = expectOne('GET', url);

    expect(request.request.params.get('before')).toBe('cursor');
    request.flush({ messages: [], before: null });
  });

  it('deletes a message, with a moderator’s reason or without', () => {
    service.remove('message-1', 'Off topic').subscribe();
    expect(
      expectOne('DELETE', `${API_URLS.CHAT}/messages/message-1`).request.body,
    ).toEqual({ reason: 'Off topic' });

    service.remove('message-2').subscribe();

    const own = expectOne('DELETE', `${API_URLS.CHAT}/messages/message-2`);

    expect(own.request.body).toEqual({});
    own.flush(null);
  });

  it('finds people who can read a channel', () => {
    service.people('channel-1', 'Ki').subscribe();

    const request = expectOne(
      'GET',
      `${API_URLS.CHAT}/channels/channel-1/people`,
    );

    expect(request.request.params.get('q')).toBe('Ki');
    request.flush([]);
  });

  it.each([
    [
      'a Community’s',
      { communityId: 'community-1', fleetId: null, armadaId: null },
      `${COMMUNITY}/chat/channels`,
    ],
    [
      'a Fleet’s',
      { communityId: 'community-1', fleetId: 'fleet-1', armadaId: null },
      `${COMMUNITY}/fleets/fleet-1/chat/channels`,
    ],
    [
      'an Armada’s',
      { communityId: 'community-1', fleetId: null, armadaId: 'armada-1' },
      `${COMMUNITY}/armadas/armada-1/chat/channels`,
    ],
  ])('adds, changes and archives %s custom channels', (_label, target, url) => {
    service.create(target, INPUT).subscribe();
    expect(expectOne('POST', url).request.body).toEqual(INPUT);

    service.update(target, 'channel-1', INPUT).subscribe();
    expect(expectOne('PATCH', `${url}/channel-1`).request.body).toEqual(INPUT);

    service.archive(target, 'channel-1').subscribe();
    expectOne('POST', `${url}/channel-1/archive`).flush(null);
  });

  it('reports a message (FC-035)', () => {
    const input = { reason: ReportReason.SPAM, details: 'Again' };

    service.report('message-1', input).subscribe();

    const request = expectOne(
      'POST',
      `${API_URLS.CHAT}/messages/message-1/report`,
    );

    expect(request.request.body).toEqual(input);
    request.flush(null);
  });

  it('asks for, lists and downloads transcripts (FC-035)', () => {
    const ask = {
      fromAt: '2026-09-28T10:00:00.000Z',
      toAt: '2026-09-28T12:00:00.000Z',
      purpose: 'Looking into it',
    };

    service.requestTranscript('channel-1', ask).subscribe();
    expect(
      expectOne('POST', `${API_URLS.CHAT}/channels/channel-1/transcripts`)
        .request.body,
    ).toEqual(ask);

    service.transcripts().subscribe();
    expectOne('GET', `${API_URLS.CHAT}/transcripts`).flush([]);

    let file: Blob | undefined;

    service.downloadTranscript('transcript-1').subscribe(got => (file = got));

    const download = expectOne(
      'GET',
      `${API_URLS.CHAT}/transcripts/transcript-1/download`,
    );

    expect(download.request.responseType).toBe('blob');
    download.flush(new Blob(['text']));
    expect(file).toBeInstanceOf(Blob);
  });

  it('refuses every call without a token', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    let error: unknown;

    service.channels().subscribe({ error: caught => (error = caught) });

    expect(error).toEqual(new Error('No token found'));
  });
});
