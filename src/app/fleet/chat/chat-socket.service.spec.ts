import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChatAck,
  ChatMessage,
  ChatMessagePage,
  ChatPlace,
} from 'src/app/models/fleet-chat.models';

import {
  CHAT_HEARTBEAT_MS,
  CHAT_TYPING_EVERY_MS,
  CHAT_ACK_TIMEOUT_MS,
  CHAT_REAUTH_LEAD_MS,
  CHAT_SOCKET_FACTORY,
  chatCursorOf,
  ChatSocketError,
  ChatSocketService,
} from './chat-socket.service';

const GENERAL: ChatPlace = { channelId: 'general' };
const TALK: ChatPlace = { conversationId: 'talk' };

/**
 * A message.
 *
 * @param id - Its ID.
 * @param at - When, as seconds past noon.
 * @param place - Where.
 * @returns The message.
 */
function messageOf(
  id: string,
  at = 0,
  place: ChatPlace = GENERAL,
): ChatMessage {
  return {
    id,
    channelId: place.channelId ?? null,
    conversationId: place.conversationId ?? null,
    author: null,
    body: id,
    clientMessageId: `client-${id}`,
    createdAt: new Date(Date.UTC(2026, 8, 28, 12, 0, at)).toISOString(),
    deleted: false,
    removed: false,
    mine: false,
    mentions: [],
    replyTo: null,
  };
}

/**
 * A successful answer.
 *
 * @param data - What it carries.
 * @returns The answer.
 */
const ok = <T>(data: T): ChatAck<T> => ({ ok: true, data });

/**
 * A refusal.
 *
 * @param status - Its status.
 * @returns The answer.
 */
const refused = (status: number): ChatAck<never> => ({
  ok: false,
  error: { status, message: `Refused ${status}` },
});

/** What the fake server answers an event with. */
type Answerer = (event: string, body: unknown) => Promise<unknown>;

/** A socket.io client socket, driven by the spec. */
class FakeSocket {
  connected = false;
  readonly sent: { event: string; body: unknown }[] = [];
  readonly connect = jest.fn(() => this.up());
  readonly disconnect = jest.fn(() => this.down('io client disconnect'));
  private readonly _handlers = new Map<
    string,
    ((...args: never[]) => void)[]
  >();
  answer: Answerer = event => {
    switch (event) {
      case 'auth':
        return Promise.resolve(ok({ expiresAt: Date.now() + 3_600_000 }));
      case 'join':
        return Promise.resolve(
          ok({ messages: [messageOf('a', 1)], before: null }),
        );
      case 'send':
        return Promise.resolve(ok(messageOf('sent', 9)));
      default:
        return Promise.resolve(ok(null));
    }
  };

  on(event: string, handler: (...args: never[]) => void): this {
    this._handlers.set(event, [...(this._handlers.get(event) ?? []), handler]);

    return this;
  }

  timeout(milliseconds: number) {
    expect(milliseconds).toBe(CHAT_ACK_TIMEOUT_MS);

    return {
      emitWithAck: (event: string, body: unknown) => {
        this.sent.push({ event, body });

        return this.answer(event, body);
      },
    };
  }

  fire(event: string, ...args: unknown[]): void {
    for (const handler of this._handlers.get(event) ?? []) {
      (handler as (...values: unknown[]) => void)(...args);
    }
  }

  up(): void {
    this.connected = true;
    this.fire('connect');
  }

  down(reason: string): void {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    this.fire('disconnect', reason);
  }

  events(name: string): unknown[] {
    return this.sent.filter(each => each.event === name).map(each => each.body);
  }
}

/** Lets pending promises settle. */
async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

describe('ChatSocketService', () => {
  let socket: FakeSocket;
  let factory: jest.Mock;
  let auth: { getToken: jest.Mock; ensureFreshAccessToken: jest.Mock };
  let service: ChatSocketService;

  beforeEach(() => {
    socket = new FakeSocket();
    factory = jest.fn(() => socket as unknown as Socket);
    auth = {
      getToken: jest.fn(() => 'token'),
      ensureFreshAccessToken: jest.fn(() => of('fresh')),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: CHAT_SOCKET_FACTORY, useValue: factory },
      ],
    });
    service = TestBed.inject(ChatSocketService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Joins a place on a socket that comes up.
   *
   * @param place - The place.
   * @returns The page.
   */
  const joined = async (
    place: ChatPlace = GENERAL,
  ): Promise<ChatMessagePage> => {
    const joining = service.join(place);

    if (!socket.connected) {
      socket.up();
    }

    return joining;
  };

  it('opens sockets with socket.io’s client unless told otherwise', () => {
    TestBed.resetTestingModule();

    expect(TestBed.inject(CHAT_SOCKET_FACTORY)).toBe(io);
  });

  describe('connecting', () => {
    it('opens a WebSocket at the API’s origin, then says who the reader is', async () => {
      expect(service.status()).toBe('idle');

      const page = await joined();

      expect(factory).toHaveBeenCalledWith('http://localhost:3000/chat', {
        path: '/chat/socket',
        transports: ['websocket'],
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 30_000,
      });
      expect(socket.events('auth')).toEqual([{ token: 'token' }]);
      expect(socket.events('join')).toEqual([GENERAL]);
      expect(page.messages.map(message => message.id)).toEqual(['a']);
      expect(service.status()).toBe('online');
    });

    it('asks for a fresh token when the stored one has run out', async () => {
      auth.getToken.mockReturnValue(null);

      await joined();

      expect(socket.events('auth')).toEqual([{ token: 'fresh' }]);
    });

    it('gives up, signed out, with no session', async () => {
      auth.getToken.mockReturnValue(null);
      auth.ensureFreshAccessToken.mockReturnValue(
        throwError(() => new Error('No token found')),
      );

      await expect(joined()).rejects.toEqual(
        new ChatSocketError(401, 'Sign in to use chat.'),
      );
      expect(service.status()).toBe('signedOut');
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('gives up, signed out, when the server refuses the token', async () => {
      socket.answer = () => Promise.resolve(refused(401));

      await expect(joined()).rejects.toMatchObject({ status: 401 });
      expect(service.status()).toBe('signedOut');
    });

    it('gives up, signed out, when the server does not answer', async () => {
      socket.answer = () =>
        Promise.reject(new Error('operation has timed out'));

      await expect(joined()).rejects.toMatchObject({ status: 401 });
    });

    it('closes quietly while chat is switched off', async () => {
      socket.answer = () => Promise.resolve(refused(404));

      await expect(joined()).rejects.toEqual(
        new ChatSocketError(0, 'Chat is closed.'),
      );
      expect(service.status()).toBe('idle');
    });

    it('opens again when asked after being closed', async () => {
      socket.answer = () => Promise.resolve(refused(404));
      await expect(joined()).rejects.toBeInstanceOf(ChatSocketError);
      socket.answer = new FakeSocket().answer;

      await expect(service.join(GENERAL)).resolves.toBeDefined();
      expect(socket.connect).toHaveBeenCalled();
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('joining and leaving', () => {
    it('refuses a place that may not be read', async () => {
      socket.answer = (event: string) =>
        Promise.resolve(
          event === 'join'
            ? refused(404)
            : ok({ expiresAt: Date.now() + 3_600_000 }),
        );

      await expect(joined()).rejects.toEqual(
        new ChatSocketError(404, 'Refused 404'),
      );
    });

    it('says chat is offline when a join goes unanswered', async () => {
      await joined();
      socket.answer = () =>
        Promise.reject(new Error('operation has timed out'));

      await expect(service.join(TALK)).rejects.toEqual(
        new ChatSocketError(0, 'Chat is offline.'),
      );
    });

    it('stops reading a place, telling the server while online', async () => {
      await joined();

      service.leave(GENERAL);

      expect(socket.events('leave')).toEqual([GENERAL]);
    });

    it('asks nothing of the server when leaving while offline', () => {
      service.leave(TALK);

      expect(socket.sent).toEqual([]);
    });

    it('ignores the server failing to answer a leave', async () => {
      await joined();
      socket.answer = () => Promise.reject(new Error('gone'));

      expect(() => service.leave(GENERAL)).not.toThrow();
      await settle();
    });
  });

  describe('receiving', () => {
    it('gives out each new message once, and deletions and removals as they come', async () => {
      const messages: string[] = [];
      const deleted: unknown[] = [];
      const removed: unknown[] = [];

      service.messages$.subscribe(message => messages.push(message.id));
      service.deleted$.subscribe(deletion => deleted.push(deletion));
      service.removed$.subscribe(place => removed.push(place));
      await joined();

      socket.fire('message', messageOf('a', 1));
      socket.fire('message', messageOf('b', 2));
      socket.fire('message', messageOf('b', 2));
      socket.fire('message', messageOf('c', 3, TALK));
      socket.fire('deleted', { ...GENERAL, messageId: 'b', removed: true });
      socket.fire('removed', GENERAL);

      expect(messages).toEqual(['b', 'c']);
      expect(deleted).toEqual([
        { channelId: 'general', messageId: 'b', removed: true },
      ]);
      expect(removed).toEqual([GENERAL]);
    });

    it('remembers only the latest five hundred per place', async () => {
      const messages: string[] = [];

      service.messages$.subscribe(message => messages.push(message.id));
      await joined();

      for (let index = 0; index < 502; index += 1) {
        socket.fire('message', messageOf(`m${index}`, index));
      }

      socket.fire('message', messageOf('a', 1));
      socket.fire('message', messageOf('m501', 501));

      // The page's 'a', 'm0' and 'm1' were forgotten, so 'a' comes again.
      expect(messages.slice(-1)).toEqual(['a']);
      expect(messages).toHaveLength(503);
    });
  });

  describe('sending', () => {
    it('posts with a client ID and gives the committed message', async () => {
      await joined();
      socket.answer = (_event, body) =>
        Promise.resolve(
          ok({
            ...messageOf('sent', 9),
            clientMessageId: (body as { clientMessageId: string })
              .clientMessageId,
          }),
        );

      const message = await service.send(GENERAL, 'Hail');
      const [sent] = socket.events('send') as { clientMessageId: string }[];

      expect(sent).toEqual({
        channelId: 'general',
        body: 'Hail',
        clientMessageId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      });
      expect(message.clientMessageId).toBe(sent.clientMessageId);
    });

    it('does not give out its own message again when the server echoes it', async () => {
      const messages: string[] = [];

      service.messages$.subscribe(message => messages.push(message.id));
      await joined();
      socket.answer = () => Promise.resolve(ok(messageOf('sent', 9)));
      await service.send(GENERAL, 'Hail');
      socket.fire('message', messageOf('sent', 9));

      expect(messages).toEqual([]);
    });

    it('sends who it mentions and what it answers', async () => {
      await joined();

      await service.send(GENERAL, '@Kira aye', {
        mentions: ['kira'],
        replyToMessageId: 'a',
      });

      expect(socket.events('send')[0]).toMatchObject({
        body: '@Kira aye',
        mentions: ['kira'],
        replyToMessageId: 'a',
      });
    });

    it('passes the server’s refusal on', async () => {
      await joined();
      socket.answer = () => Promise.resolve(refused(429));

      await expect(service.send(GENERAL, 'Hail')).rejects.toEqual(
        new ChatSocketError(429, 'Refused 429'),
      );
    });

    it('sends again at once, with the same ID, when unanswered on a live socket', async () => {
      await joined();

      let tries = 0;

      socket.answer = () =>
        ++tries === 1
          ? Promise.reject(new Error('operation has timed out'))
          : Promise.resolve(ok(messageOf('sent', 9)));

      await service.send(GENERAL, 'Hail');

      const ids = (socket.events('send') as { clientMessageId: string }[]).map(
        each => each.clientMessageId,
      );

      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(1);
    });

    it('waits for the connection to come back, then sends again with the same ID', async () => {
      await joined();

      let tries = 0;
      const normal = socket.answer;

      socket.answer = (event, body) => {
        if (event === 'send' && ++tries === 1) {
          socket.down('transport close');

          return Promise.reject(new Error('socket has been disconnected'));
        }

        return event === 'send'
          ? Promise.resolve(ok(messageOf('sent', 9)))
          : normal(event, body);
      };

      const sending = service.send(GENERAL, 'Hail');

      await settle();
      expect(service.status()).toBe('offline');
      socket.up();

      await expect(sending).resolves.toMatchObject({ id: 'sent' });
      expect(service.status()).toBe('online');
    });

    it('marks the socket offline when a send finds it already gone', async () => {
      await joined();

      let tries = 0;
      const normal = socket.answer;

      socket.answer = (event, body) => {
        if (event === 'send' && ++tries === 1) {
          socket.connected = false;

          return Promise.reject(new Error('socket has been disconnected'));
        }

        return event === 'send'
          ? Promise.resolve(ok(messageOf('sent', 9)))
          : normal(event, body);
      };

      const sending = service.send(GENERAL, 'Hail');

      await settle();
      expect(service.status()).toBe('offline');
      socket.up();

      await expect(sending).resolves.toMatchObject({ id: 'sent' });
    });
  });

  describe('reconnecting', () => {
    it('joins every place again from the last message held, giving out what was missed', async () => {
      const messages: string[] = [];

      service.messages$.subscribe(message => messages.push(message.id));
      await joined();
      socket.fire('message', messageOf('b', 2));
      socket.down('transport close');
      expect(service.status()).toBe('offline');

      socket.answer = (event, body) =>
        Promise.resolve(
          event === 'join'
            ? ok({
                messages: [messageOf('b', 2), messageOf('c', 3)],
                before: null,
              })
            : ok({ expiresAt: Date.now() + 3_600_000, body }),
        );
      socket.up();
      await settle();

      expect(socket.events('join')[1]).toEqual({
        ...GENERAL,
        after: chatCursorOf(messageOf('b', 2)),
      });
      expect(messages).toEqual(['b', 'c']);
      expect(service.status()).toBe('online');
    });

    it('keeps the cursor it holds when the server has nothing newer', async () => {
      await joined();
      socket.fire('message', messageOf('b', 2));
      socket.fire('message', messageOf('old', 0));
      socket.down('transport close');
      socket.answer = (event, body) =>
        Promise.resolve(
          event === 'join'
            ? ok({ messages: [], before: null })
            : ok({ expiresAt: Date.now() + 3_600_000, body }),
        );
      socket.up();
      await settle();
      socket.down('transport close');
      socket.up();
      await settle();

      expect(socket.events('join')[2]).toEqual({
        ...GENERAL,
        after: chatCursorOf(messageOf('b', 2)),
      });
    });

    it('rejoins a place first read empty from its latest page', async () => {
      socket.answer = (event, body) =>
        Promise.resolve(
          event === 'join'
            ? ok({ messages: [], before: null })
            : ok({ expiresAt: Date.now() + 3_600_000, body }),
        );
      await joined();
      socket.down('transport close');
      socket.up();
      await settle();

      expect(socket.events('join')).toEqual([GENERAL, GENERAL]);
    });

    it('drops a place it may no longer read', async () => {
      const removed: unknown[] = [];

      service.removed$.subscribe(place => removed.push(place));
      await joined();
      socket.down('transport close');
      socket.answer = (event, body) =>
        Promise.resolve(
          event === 'join'
            ? refused(404)
            : ok({ expiresAt: Date.now() + 3_600_000, body }),
        );
      socket.up();
      await settle();
      socket.down('transport close');
      socket.up();
      await settle();

      expect(removed).toEqual([GENERAL]);
      expect(socket.events('join')).toHaveLength(2);
    });

    it('tries a place again on the next connection when the rejoin goes unanswered', async () => {
      const removed: unknown[] = [];

      service.removed$.subscribe(place => removed.push(place));
      await joined();
      socket.down('transport close');

      const normal = socket.answer;

      socket.answer = (event, body) =>
        event === 'join'
          ? Promise.reject(new Error('gone'))
          : normal(event, body);
      socket.up();
      await settle();
      socket.answer = normal;
      socket.down('transport close');
      socket.up();
      await settle();

      expect(removed).toEqual([]);
      expect(socket.events('join')).toHaveLength(3);
      expect(service.status()).toBe('online');
    });

    it('refreshes the token and reconnects when the server closes the socket', async () => {
      await joined();
      socket.connect.mockClear();

      socket.down('io server disconnect');
      await settle();

      expect(auth.ensureFreshAccessToken).toHaveBeenCalled();
      expect(socket.connect).toHaveBeenCalled();
    });

    it('stops, signed out, when the server closes the socket and no token can be had', async () => {
      await joined();
      auth.ensureFreshAccessToken.mockReturnValue(
        throwError(() => new Error('gone')),
      );

      socket.down('io server disconnect');
      await settle();

      expect(service.status()).toBe('signedOut');
    });

    it('does not reconnect a socket that gave way to the reader’s other tabs', async () => {
      await joined();
      socket.connect.mockClear();

      socket.fire('replaced');
      await settle();

      expect(service.status()).toBe('replaced');
      expect(socket.connect).not.toHaveBeenCalled();
      await expect(service.send(GENERAL, 'Hail')).resolves.toBeDefined();
    });

    it('ignores a lost connection it already knew about', async () => {
      await joined();
      socket.down('transport close');
      socket.connected = true;
      socket.fire('disconnect', 'transport close');

      expect(service.status()).toBe('offline');
    });
  });

  describe('presence, typing and notices (FC-034)', () => {
    it('says every thirty seconds that the reader is still here, until it stops', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-29T12:00:00Z') });
      await joined();

      await jest.advanceTimersByTimeAsync(CHAT_HEARTBEAT_MS);
      expect(socket.events('heartbeat')).toEqual([null]);

      // A second sign-in replaces the heartbeat rather than adding one.
      socket.down('transport close');
      socket.up();
      await jest.advanceTimersByTimeAsync(CHAT_HEARTBEAT_MS);
      expect(socket.events('heartbeat')).toHaveLength(2);

      service.disconnect();
      await jest.advanceTimersByTimeAsync(CHAT_HEARTBEAT_MS * 2);
      expect(socket.events('heartbeat')).toHaveLength(2);
    });

    it('ignores a heartbeat the server does not answer', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-29T12:00:00Z') });
      await joined();
      socket.answer = () => Promise.reject(new Error('timed out'));

      await jest.advanceTimersByTimeAsync(CHAT_HEARTBEAT_MS);

      expect(service.status()).toBe('online');
    });

    it('says the reader is writing at most every few seconds a place, and only online', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-29T12:00:00Z') });
      service.typing(GENERAL);
      expect(socket.events('typing')).toEqual([]);

      await joined();
      service.typing(GENERAL);
      service.typing(GENERAL);
      service.typing(TALK);
      expect(socket.events('typing')).toEqual([GENERAL, TALK]);

      jest.advanceTimersByTime(CHAT_TYPING_EVERY_MS);
      socket.answer = () => Promise.reject(new Error('gone'));
      service.typing(GENERAL);
      await settle();
      expect(socket.events('typing')).toHaveLength(3);
    });

    it('passes on who is writing, and notices for the reader', async () => {
      const typing: unknown[] = [];
      const notices: unknown[] = [];

      service.typing$.subscribe(each => typing.push(each));
      service.notices$.subscribe(each => notices.push(each));
      await joined();

      socket.fire('typing', {
        ...GENERAL,
        user: { userId: 'k', username: 'Kira' },
      });
      socket.fire('notice', { kind: 'direct', ...TALK, from: null });

      expect(typing).toHaveLength(1);
      expect(notices).toEqual([
        { kind: 'direct', conversationId: 'talk', from: null },
      ]);
    });
  });

  describe('fresh tokens', () => {
    it('sends a fresh token a minute before the old one runs out', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00Z') });
      socket.answer = (event, body) =>
        Promise.resolve(
          event === 'auth'
            ? ok({ expiresAt: Date.now() + 120_000 })
            : ok({ messages: [], before: null, body }),
        );
      await joined();

      await jest.advanceTimersByTimeAsync(120_000 - CHAT_REAUTH_LEAD_MS);

      expect(socket.events('auth')).toEqual([
        { token: 'token' },
        { token: 'fresh' },
      ]);

      // And again before that one runs out.
      await jest.advanceTimersByTimeAsync(120_000 - CHAT_REAUTH_LEAD_MS);
      expect(socket.events('auth')).toHaveLength(3);
    });

    it('stops trying when no fresh token can be had, or the server refuses it', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00Z') });

      let auths = 0;

      socket.answer = event => {
        if (event === 'auth') {
          auths += 1;

          return auths === 1
            ? Promise.resolve(ok({ expiresAt: Date.now() + 1_000 }))
            : Promise.reject(new Error('timed out'));
        }

        return Promise.resolve(ok({ messages: [], before: null }));
      };
      await joined();
      await jest.advanceTimersByTimeAsync(1);
      expect(auths).toBe(2);

      auth.ensureFreshAccessToken.mockReturnValue(
        throwError(() => new Error('gone')),
      );
      socket.down('transport close');
      socket.answer = event =>
        Promise.resolve(
          event === 'auth'
            ? ok({ expiresAt: Date.now() + 1_000 })
            : ok({ messages: [], before: null }),
        );
      socket.up();
      await jest.advanceTimersByTimeAsync(1);

      expect(auths).toBe(2);
      expect(socket.events('auth')).toHaveLength(3);
    });
  });

  describe('closing', () => {
    it('closes the socket and forgets every place', async () => {
      await joined();

      service.ngOnDestroy();

      expect(service.status()).toBe('idle');
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('closes nothing that was never opened', () => {
      service.disconnect();

      expect(factory).not.toHaveBeenCalled();
    });
  });
});
