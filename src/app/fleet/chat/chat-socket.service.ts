import {
  inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  signal,
} from '@angular/core';

import { firstValueFrom, Subject } from 'rxjs';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChatAck,
  ChatDeletion,
  ChatMessage,
  ChatMessagePage,
  ChatNotice,
  ChatPlace,
  ChatPostOptions,
  ChatSocketStatus,
  ChatTyping,
} from 'src/app/models/fleet-chat.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Opens a socket.io connection; replaced in specs. */
export type ChatSocketFactory = (
  uri: string,
  options: Partial<ManagerOptions & SocketOptions>,
) => Socket;

/** How chat's socket is opened: socket.io's client, unless a spec says. */
export const CHAT_SOCKET_FACTORY = new InjectionToken<ChatSocketFactory>(
  'CHAT_SOCKET_FACTORY',
  { providedIn: 'root', factory: () => io },
);

/** Where the socket is served, beside the API (FC-032). */
export const CHAT_SOCKET_PATH = '/chat/socket';

/** How long to wait for the server to answer an event, in milliseconds. */
export const CHAT_ACK_TIMEOUT_MS = 10_000;

/** How long before the token runs out to send a fresh one, in milliseconds. */
export const CHAT_REAUTH_LEAD_MS = 60_000;

/** How often the socket says it is still here, in milliseconds (FC-034). */
export const CHAT_HEARTBEAT_MS = 30_000;

/** The least time between two typing signals for one place, in milliseconds. */
export const CHAT_TYPING_EVERY_MS = 3_000;

/** How many message IDs are remembered per place, to keep one copy each. */
const SEEN_KEPT = 500;

/** A refusal from the chat socket, with the HTTP status the server gave. */
export class ChatSocketError extends Error {
  /**
   * Creates an instance of ChatSocketError.
   *
   * @param status - The status, or 0 when chat could not be reached.
   * @param message - What the server said.
   */
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A promise, with its ends in reach. */
interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: ChatSocketError) => void;
}

/**
 * A promise to settle later.
 *
 * @returns It.
 */
function deferred(): Deferred {
  const ends = {} as Deferred;

  ends.promise = new Promise<void>((resolve, reject) => {
    ends.resolve = resolve;
    ends.reject = reject;
  });
  // Nobody may be waiting when it is refused.
  ends.promise.catch(() => undefined);

  return ends;
}

/**
 * The key for a place.
 *
 * @param place - The channel or conversation.
 * @returns Its key.
 */
function keyOf(place: ChatPlace): string {
  return place.channelId === undefined
    ? `conversation:${place.conversationId}`
    : `channel:${place.channelId}`;
}

/**
 * The place a message is in.
 *
 * @param message - The message.
 * @returns Its channel or conversation.
 */
function placeOf(message: ChatMessage): ChatPlace {
  return message.channelId === null
    ? { conversationId: message.conversationId as string }
    : { channelId: message.channelId };
}

/**
 * The cursor naming a message, as the API reads it.
 *
 * @param message - The message.
 * @returns `<ISO instant>_<ID>`.
 */
export function chatCursorOf(message: ChatMessage): string {
  return `${new Date(message.createdAt).toISOString()}_${message.id}`;
}

/**
 * Chat's live connection (FC-032).
 *
 * Steve's decisions of 28 September 2026:
 *
 * - WebSocket only, opened when a chat page first needs it. The access token
 *   is sent in the first message, never in the address, and again with a
 *   fresh one a minute before it runs out.
 * - A message is sent with an ID the browser chooses, and sent again with
 *   the same ID until the server acknowledges it, so a dropped connection
 *   never loses or doubles one.
 * - Reconnecting — to whichever instance — joins every place again from the
 *   last message held, so nothing posted meanwhile is missed, within the
 *   four-hour window. Each message is given out once, however many times it
 *   arrives.
 * - A reader with five other tabs open is told this one gave way, and it
 *   does not reconnect by itself.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatSocketService implements OnDestroy {
  private readonly _auth = inject(AuthService);
  private readonly _factory = inject(CHAT_SOCKET_FACTORY);

  private readonly _status = signal<ChatSocketStatus>('idle');
  private readonly _messages = new Subject<ChatMessage>();
  private readonly _deleted = new Subject<ChatDeletion>();
  private readonly _removed = new Subject<ChatPlace>();
  private readonly _typing = new Subject<ChatTyping>();
  private readonly _notices = new Subject<ChatNotice>();

  /** Where the socket stands. */
  readonly status = this._status.asReadonly();

  /** Each new message in a place being read, once. */
  readonly messages$ = this._messages.asObservable();

  /** Each message deleted in a place being read. */
  readonly deleted$ = this._deleted.asObservable();

  /** Each place the reader may no longer read, and has left. */
  readonly removed$ = this._removed.asObservable();

  /** Somebody writing in a place being read (FC-034). */
  readonly typing$ = this._typing.asObservable();

  /** Each direct message or mention for the reader, wherever they are. */
  readonly notices$ = this._notices.asObservable();

  private _socket: Socket | null = null;
  private _online = deferred();
  private _reauth: ReturnType<typeof setTimeout> | null = null;
  private _heartbeat: ReturnType<typeof setInterval> | null = null;

  /** When the reader last said they were writing, by place. */
  private readonly _typedAt = new Map<string, number>();

  /** Each place being read, and the last message held there. */
  private readonly _joined = new Map<
    string,
    { place: ChatPlace; cursor: string | null }
  >();

  /** The message IDs already given out, by place. */
  private readonly _seen = new Map<string, Set<string>>();

  /**
   * Starts reading a place: its latest page, then each new message through
   * {@link messages$}.
   *
   * @param place - The channel or conversation.
   * @returns The latest page.
   * @throws ChatSocketError when it may not be read, or chat is offline.
   */
  async join(place: ChatPlace): Promise<ChatMessagePage> {
    await this.ready();

    const page = await this.joinNow(place, undefined);

    this._joined.set(keyOf(place), { place, cursor: null });

    for (const message of page.messages) {
      this.remember(message);
    }

    return page;
  }

  /**
   * Stops reading a place.
   *
   * @param place - The channel or conversation.
   */
  leave(place: ChatPlace): void {
    this._joined.delete(keyOf(place));
    this._seen.delete(keyOf(place));

    if (this._status() === 'online') {
      void this.ask('leave', place).catch(() => undefined);
    }
  }

  /**
   * Posts a message, sending it again with the same ID until the server
   * acknowledges it.
   *
   * @param place - The channel or conversation.
   * @param body - What it says.
   * @param options - Who it mentions, and what it answers.
   * @returns The message, as committed.
   * @throws ChatSocketError when the server refuses it, or the reader is
   *   signed out.
   */
  async send(
    place: ChatPlace,
    body: string,
    options: ChatPostOptions = {},
  ): Promise<ChatMessage> {
    const clientMessageId = crypto.randomUUID();

    for (;;) {
      await this.ready();

      let ack: ChatAck<ChatMessage>;

      try {
        ack = await this.ask<ChatMessage>('send', {
          ...place,
          ...options,
          body,
          clientMessageId,
        });
      } catch {
        // Unanswered. Send it again: at once if still connected, else once
        // back.
        if (!this._socket?.connected) {
          this.goOffline();
        }

        continue;
      }

      if (!ack.ok) {
        throw new ChatSocketError(ack.error.status, ack.error.message);
      }

      this.remember(ack.data);

      return ack.data;
    }
  }

  /**
   * Says the reader is writing in a place, at most every few seconds. The
   * server passes it on only if they share their typing.
   *
   * @param place - The channel or conversation.
   */
  typing(place: ChatPlace): void {
    const key = keyOf(place);
    const now = Date.now();

    if (
      this._status() !== 'online' ||
      now - (this._typedAt.get(key) ?? 0) < CHAT_TYPING_EVERY_MS
    ) {
      return;
    }

    this._typedAt.set(key, now);
    void this.ask('typing', place).catch(() => undefined);
  }

  /**
   * Closes the socket and forgets every place.
   */
  disconnect(): void {
    this._joined.clear();
    this._seen.clear();
    this.stop('idle');
  }

  /**
   * Closes the socket with the page.
   */
  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Waits until the socket may be used, opening it if nothing has.
   *
   * @returns Once it is online.
   * @throws ChatSocketError when the reader is signed out.
   */
  ready(): Promise<void> {
    if (this._socket === null) {
      // A disconnect before the first open, as the session makes while
      // sign-in is still settling, refused the first wait; this one is new.
      this._online = deferred();
      this._socket = this.open();
    } else if (['idle', 'signedOut', 'replaced'].includes(this._status())) {
      this._online = deferred();
      this._status.set('connecting');
      this._socket.connect();
    }

    return this._online.promise;
  }

  /**
   * Opens the socket and listens to it.
   *
   * @returns The socket.
   */
  private open(): Socket {
    const socket = this._factory(`${new URL(API_URLS.ROOT).origin}/chat`, {
      path: CHAT_SOCKET_PATH,
      transports: ['websocket'],
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
    });

    this._status.set('connecting');
    socket.on('connect', () => void this.authenticate());
    socket.on('disconnect', (reason: string) => this.lost(reason));
    socket.on('replaced', () => this.stop('replaced'));
    socket.on('message', (message: ChatMessage) => {
      if (this.remember(message)) {
        this._messages.next(message);
      }
    });
    socket.on('deleted', (deletion: ChatDeletion) =>
      this._deleted.next(deletion),
    );
    socket.on('typing', (typing: ChatTyping) => this._typing.next(typing));
    socket.on('notice', (notice: ChatNotice) => this._notices.next(notice));
    socket.on('removed', (place: ChatPlace) => {
      this._joined.delete(keyOf(place));
      this._seen.delete(keyOf(place));
      this._removed.next(place);
    });

    return socket;
  }

  /**
   * Says who the reader is, then joins every place again from the last
   * message held, then lets waiting sends go.
   */
  private async authenticate(): Promise<void> {
    this._status.set('connecting');

    const token = this._auth.getToken() ?? (await this.freshToken());
    const ack =
      token === null
        ? null
        : await this.ask<{ expiresAt: number }>('auth', { token }).catch(
            () => null,
          );

    if (ack === null || !ack.ok) {
      this.stop(
        ack === null || ack.error.status === 401 ? 'signedOut' : 'idle',
      );

      return;
    }

    this.scheduleReauth(ack.data.expiresAt);
    this.startHeartbeat();

    for (const [key, joined] of [...this._joined]) {
      try {
        const page = await this.joinNow(
          joined.place,
          joined.cursor ?? undefined,
        );

        for (const message of page.messages) {
          if (this.remember(message)) {
            this._messages.next(message);
          }
        }
      } catch (error) {
        // Gone again: the next connection tries once more.
        if ((error as ChatSocketError).status === 0) {
          return;
        }

        this._joined.delete(key);
        this._seen.delete(key);
        this._removed.next(joined.place);
      }
    }

    this._status.set('online');
    this._online.resolve();
  }

  /**
   * Handles a lost connection: the server closed it — a token that ran
   * out, or a restart — or the network did.
   *
   * @param reason - What socket.io says happened.
   */
  private lost(reason: string): void {
    this.clearReauth();

    if (this._status() !== 'online' && this._status() !== 'connecting') {
      return;
    }

    this.goOffline();

    // socket.io does not reconnect after the server closes a socket itself.
    if (reason === 'io server disconnect') {
      void this.freshToken().then(token => {
        if (token === null) {
          this.stop('signedOut');
        } else {
          this._socket?.connect();
        }
      });
    }
  }

  /**
   * Marks the socket as reconnecting: sends wait until it is back.
   */
  private goOffline(): void {
    if (this._status() === 'online') {
      this._online = deferred();
    }

    this._status.set('offline');
  }

  /**
   * Closes the socket for good, refusing anything waiting for it.
   *
   * @param status - Why.
   */
  private stop(status: 'idle' | 'signedOut' | 'replaced'): void {
    this.clearReauth();
    this._status.set(status);
    this._online.reject(
      new ChatSocketError(
        status === 'signedOut' ? 401 : 0,
        status === 'signedOut' ? 'Sign in to use chat.' : 'Chat is closed.',
      ),
    );
    this._socket?.disconnect();
  }

  /**
   * Asks the server to join a place, from a cursor or its latest page.
   *
   * @param place - The channel or conversation.
   * @param after - The last message held, if any.
   * @returns The page.
   * @throws ChatSocketError when it may not be read, or chat is offline.
   */
  private async joinNow(
    place: ChatPlace,
    after: string | undefined,
  ): Promise<ChatMessagePage> {
    let ack: ChatAck<ChatMessagePage>;

    try {
      ack = await this.ask<ChatMessagePage>(
        'join',
        after === undefined ? place : { ...place, after },
      );
    } catch {
      throw new ChatSocketError(0, 'Chat is offline.');
    }

    if (!ack.ok) {
      throw new ChatSocketError(ack.error.status, ack.error.message);
    }

    return ack.data;
  }

  /**
   * Keeps one copy of each message, and the last one held in its place.
   *
   * @param message - The message.
   * @returns True when it had not been seen.
   */
  private remember(message: ChatMessage): boolean {
    const key = keyOf(placeOf(message));
    const seen = this._seen.get(key) ?? new Set<string>();

    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);

    if (seen.size > SEEN_KEPT) {
      seen.delete(seen.values().next().value as string);
    }

    this._seen.set(key, seen);

    const joined = this._joined.get(key);

    if (joined !== undefined) {
      joined.cursor = this.cursorAfter(message, joined.cursor);
    }

    return true;
  }

  /**
   * The later of a cursor and a message's.
   *
   * @param message - The message.
   * @param cursor - The cursor held.
   * @returns The later cursor.
   */
  private cursorAfter(message: ChatMessage, cursor: string | null): string {
    const candidate = chatCursorOf(message);

    return cursor === null || candidate > cursor ? candidate : cursor;
  }

  /**
   * Sends a fresh token a minute before the one shown runs out.
   *
   * @param expiresAt - When it runs out, in milliseconds.
   */
  private scheduleReauth(expiresAt: number): void {
    this.clearReauth();
    this._reauth = setTimeout(
      () => {
        void this.freshToken().then(async token => {
          const ack =
            token === null
              ? null
              : await this.ask<{ expiresAt: number }>('auth', { token }).catch(
                  () => null,
                );

          if (ack?.ok) {
            this.scheduleReauth(ack.data.expiresAt);
          }
        });
      },
      Math.max(0, expiresAt - Date.now() - CHAT_REAUTH_LEAD_MS),
    );
  }

  /**
   * Stops the fresh-token timer and the heartbeat.
   */
  private clearReauth(): void {
    if (this._reauth !== null) {
      clearTimeout(this._reauth);
      this._reauth = null;
    }

    if (this._heartbeat !== null) {
      clearInterval(this._heartbeat);
      this._heartbeat = null;
    }
  }

  /**
   * Says every thirty seconds that the reader is still here, keeping them
   * online (FC-034). A lost connection has already stopped the last one.
   */
  private startHeartbeat(): void {
    this._heartbeat = setInterval(() => {
      void this.ask('heartbeat', null).catch(() => undefined);
    }, CHAT_HEARTBEAT_MS);
  }

  /**
   * A fresh access token, or null when there is no session to refresh.
   *
   * @returns The token.
   */
  private freshToken(): Promise<string | null> {
    return firstValueFrom(this._auth.ensureFreshAccessToken()).catch(
      () => null,
    );
  }

  /**
   * Sends an event and waits for its answer.
   *
   * @param event - The event.
   * @param body - Its payload.
   * @returns The answer.
   */
  private ask<T>(event: string, body: unknown): Promise<ChatAck<T>> {
    return (this._socket as Socket)
      .timeout(CHAT_ACK_TIMEOUT_MS)
      .emitWithAck(event, body) as Promise<ChatAck<T>>;
  }
}
