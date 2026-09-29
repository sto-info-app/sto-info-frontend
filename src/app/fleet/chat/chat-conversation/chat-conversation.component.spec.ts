import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  ChatDeletion,
  ChatMessage,
  ChatMessagePage,
  ChatPerson,
  ChatPlace,
  ChatTyping,
} from 'src/app/models/fleet-chat.models';

import { ReportReason } from 'src/app/models/moderation.models';

import { ChatRemoveDialogComponent } from '../chat-remove-dialog/chat-remove-dialog.component';
import { ChatReportDialogComponent } from '../chat-report-dialog/chat-report-dialog.component';
import { ChatSocketError, ChatSocketService } from '../chat-socket.service';
import { ChatService } from '../chat.service';
import { ChatConversationComponent } from './chat-conversation.component';

const GENERAL: ChatPlace = { channelId: 'general' };
const OTHER: ChatPlace = { channelId: 'other' };
const KIRA: ChatPerson = { userId: 'kira', username: 'Kira' };
const ODO: ChatPerson = { userId: 'odo', username: 'Odo' };

/**
 * A message in General.
 *
 * @param id - Its ID.
 * @param minute - Its minute past noon on 28 September 2026.
 * @param overrides - What differs.
 * @returns The message.
 */
function messageOf(
  id: string,
  minute: number,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id,
    channelId: 'general',
    conversationId: null,
    author: KIRA,
    body: `Message ${id}`,
    clientMessageId: `client-${id}`,
    createdAt: new Date(Date.UTC(2026, 8, 28, 12, minute)).toISOString(),
    deleted: false,
    mine: false,
    hidden: false,
    mentions: [],
    replyTo: null,
    ...overrides,
  };
}

/**
 * A call that fails when made, not before.
 *
 * @param error - What it fails with.
 * @returns The call.
 */
const rejecting =
  (error: Error): (() => Promise<never>) =>
  () =>
    Promise.reject(error);

describe('ChatConversationComponent', () => {
  let fixture: ComponentFixture<ChatConversationComponent>;
  let element: HTMLElement;
  let messages$: Subject<ChatMessage>;
  let deleted$: Subject<ChatDeletion>;
  let removed$: Subject<ChatPlace>;
  let typing$: Subject<ChatTyping>;
  let typingOn: boolean;
  let socket: {
    messages$: Subject<ChatMessage>;
    deleted$: Subject<ChatDeletion>;
    removed$: Subject<ChatPlace>;
    typing$: Subject<ChatTyping>;
    join: jest.Mock;
    leave: jest.Mock;
    send: jest.Mock;
    typing: jest.Mock;
  };
  let chat: {
    older: jest.Mock;
    remove: jest.Mock;
    people: jest.Mock;
    report: jest.Mock;
  };
  let dialogResult: unknown;
  let dialog: { open: jest.Mock };
  let page: ChatMessagePage;

  beforeEach(() => {
    messages$ = new Subject();
    deleted$ = new Subject();
    removed$ = new Subject();
    typing$ = new Subject();
    typingOn = true;
    page = { messages: [messageOf('a', 0)], before: null };
    socket = {
      messages$,
      deleted$,
      removed$,
      typing$,
      typing: jest.fn(),
      join: jest.fn(() => Promise.resolve(page)),
      leave: jest.fn(),
      send: jest.fn((_place: ChatPlace, body: string) =>
        Promise.resolve(messageOf('sent', 30, { body, mine: true })),
      ),
    };
    chat = {
      older: jest.fn(() =>
        of({
          messages: [messageOf('old', -10), messageOf('a', 0)],
          before: null,
        }),
      ),
      remove: jest.fn(() => of(undefined)),
      people: jest.fn(() => of([KIRA])),
      report: jest.fn(() => of(undefined)),
    };
    dialogResult = true;
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })),
    };
    HTMLElement.prototype.scrollIntoView = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatConversationComponent],
      providers: [
        { provide: ChatSocketService, useValue: socket },
        { provide: ChatService, useValue: chat },
        { provide: MatDialog, useValue: dialog },
        {
          provide: UserSettingsService,
          useValue: {
            displayTimezone: () => 'UTC',
            current: () => ({ typingIndicatorsEnabled: typingOn }),
          },
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Shows the conversation and waits for it to open.
   *
   * @param inputs - Its inputs besides the place and title.
   */
  async function show(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(ChatConversationComponent);
    fixture.componentRef.setInput('place', GENERAL);
    fixture.componentRef.setInput('title', '# General');

    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }

    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
    await settle();
  }

  const texts = (selector: string): string[] =>
    [...element.querySelectorAll(selector)].map(
      each => each.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  const button = (label: string): HTMLButtonElement =>
    [...element.querySelectorAll('button')].find(each =>
      each.textContent?.includes(label),
    ) as HTMLButtonElement;
  const composer = (): HTMLTextAreaElement =>
    element.querySelector('#chat-composer-input') as HTMLTextAreaElement;

  /**
   * Types into the composer, with the caret at the end.
   *
   * @param value - The text.
   */
  function type(value: string): void {
    composer().value = value;
    composer().setSelectionRange(value.length, value.length);
    composer().dispatchEvent(new Event('input'));
  }

  /**
   * Presses a key in the composer.
   *
   * @param key - The key.
   * @param shiftKey - Whether Shift is held.
   * @returns Whether it was stopped from doing its usual thing.
   */
  function press(key: string, shiftKey = false): boolean {
    const event = new KeyboardEvent('keydown', {
      key,
      shiftKey,
      cancelable: true,
    });

    composer().dispatchEvent(event);

    return event.defaultPrevented;
  }

  /** Whether the clock is Jest's, so waiting must move it on. */
  let fakeTime = false;

  /** Lets promises, effects and rendering catch up. */
  async function settle(): Promise<void> {
    for (let round = 0; round < 3; round += 1) {
      if (fakeTime) {
        await jest.advanceTimersByTimeAsync(0);
      } else {
        await fixture.whenStable();
      }

      await Promise.resolve();
      fixture.detectChanges();
    }
  }

  describe('opening', () => {
    it('joins the place and shows its latest page, and the four-hour edge', async () => {
      await show({ subtitle: 'Fleet · Fixture Fleet' });

      expect(socket.join).toHaveBeenCalledWith(GENERAL);
      expect(texts('.chat-message__text')).toEqual(['Message a']);
      expect(texts('.chat-conversation__subtitle')).toEqual([
        'Fleet · Fixture Fleet',
      ]);
      expect(texts('.chat-conversation__edge-note')).toEqual([
        'Chat keeps the last four hours here.',
      ]);
    });

    it('offers earlier messages, then the edge', async () => {
      page = { messages: [messageOf('a', 0)], before: 'cursor' };
      await show();

      button('Load earlier').click();
      await settle();

      expect(chat.older).toHaveBeenCalledTimes(1);
      expect(chat.older).toHaveBeenCalledWith(GENERAL, 'cursor');
      expect(texts('.chat-message__text')).toEqual([
        'Message old',
        'Message a',
      ]);
      expect(texts('.chat-conversation__edge-note')).toHaveLength(1);
    });

    it('says when earlier messages could not be read', async () => {
      page = { messages: [], before: 'cursor' };
      chat.older.mockReturnValue(throwError(() => new Error('offline')));
      await show();

      button('Load earlier').click();
      await settle();

      expect(texts('app-lcars-error-message')).toHaveLength(1);
      expect(fixture.componentInstance.errorMessage()).toBe(
        'Earlier messages could not be read.',
      );
    });

    it.each([
      [
        new ChatSocketError(404, 'Not found'),
        'This is not there, or you can no longer read it.',
      ],
      [
        new ChatSocketError(0, 'Chat is offline.'),
        'Chat could not be reached. It will try again when you come back.',
      ],
    ])('says why a place could not be opened', async (error, message) => {
      socket.join.mockImplementation(rejecting(error));
      await show();

      expect(fixture.componentInstance.errorMessage()).toBe(message);
      expect(element.querySelector('.chat-conversation__edge')).toBeNull();
    });

    it('leaves one place for the next, and the last when destroyed', async () => {
      await show();

      fixture.componentRef.setInput('place', OTHER);
      await settle();
      expect(socket.leave).toHaveBeenCalledWith(GENERAL);
      expect(socket.join).toHaveBeenLastCalledWith(OTHER);

      fixture.destroy();
      expect(socket.leave).toHaveBeenLastCalledWith(OTHER);
    });

    it('leaves nothing when destroyed before it could join', async () => {
      socket.join.mockImplementation(
        rejecting(new ChatSocketError(0, 'offline')),
      );
      await show();

      fixture.destroy();

      expect(socket.leave).not.toHaveBeenCalled();
    });

    it('joins again when asked, as after another tab took its place', async () => {
      await show();

      fixture.componentInstance.reopen();
      await settle();

      expect(socket.join).toHaveBeenCalledTimes(2);
    });
  });

  describe('the log', () => {
    it('writes every message as text, marking only the server’s mentions', async () => {
      page = {
        messages: [
          messageOf('a', 0, {
            body: '<img src=x onerror="alert(1)"> @Odo and @Kira',
            mentions: [ODO],
          }),
        ],
        before: null,
      };
      await show();

      expect(element.querySelector('.chat-message img')).toBeNull();
      expect(texts('.chat-message__text')).toEqual([
        '<img src=x onerror="alert(1)"> @Odo and @Kira',
      ]);
      expect(texts('.chat-message__mention')).toEqual(['@Odo']);
    });

    it('groups an author’s run of messages, and marks the day', async () => {
      page = {
        messages: [
          messageOf('a', 0),
          messageOf('b', 2),
          messageOf('c', 3, { author: ODO, mine: true }),
          messageOf('d', 60 * 24),
        ],
        before: null,
      };
      await show();

      expect(texts('.chat-conversation__day')).toEqual([
        'Monday 28 September',
        'Tuesday 29 September',
      ]);
      expect(texts('.chat-message__author')).toEqual(['Kira', 'Odo', 'Kira']);
      expect(element.querySelectorAll('.chat-message--mine')).toHaveLength(1);
      expect(texts('.chat-message__time')[0]).toBe('12:00');
    });

    it('shows what a reply answers, or that it is gone', async () => {
      page = {
        messages: [
          messageOf('a', 0, {
            replyTo: { id: 'z', author: ODO, excerpt: 'Shields up' },
          }),
          messageOf('b', 1, {
            replyTo: { id: 'y', author: null, excerpt: null },
          }),
          messageOf('c', 2, { deleted: true, body: null }),
        ],
        before: null,
      };
      await show();

      expect(texts('.chat-message__reply-to')).toEqual([
        'Odo: Shields up',
        'Earlier message',
      ]);
      expect(texts('.chat-message__text--deleted')).toEqual([
        'Message deleted',
      ]);
    });

    it('scrolls to the answered message when it is shown', async () => {
      page = {
        messages: [
          messageOf('a', 0),
          messageOf('b', 1, {
            replyTo: { id: 'a', author: KIRA, excerpt: 'Message a' },
          }),
        ],
        before: null,
      };
      await show();

      (
        element.querySelector('.chat-message__reply-to') as HTMLButtonElement
      ).click();

      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        block: 'center',
      });
      expect(document.activeElement?.id).toBe('chat-message-a');
    });

    it('keeps to the bottom, and counts what arrives while the reader is reading back', async () => {
      await show();

      const log = element.querySelector(
        '.chat-conversation__log',
      ) as HTMLElement;

      Object.defineProperty(log, 'scrollHeight', {
        value: 1_000,
        configurable: true,
      });
      Object.defineProperty(log, 'clientHeight', {
        value: 100,
        configurable: true,
      });
      messages$.next(messageOf('b', 1));
      await settle();
      expect(log.scrollTop).toBe(1_000);

      log.scrollTop = 0;
      log.dispatchEvent(new Event('scroll'));
      messages$.next(messageOf('c', 2));
      messages$.next(messageOf('d', 3, { mine: true }));
      await settle();

      expect(button('1 new message')).toBeTruthy();
      messages$.next(messageOf('e', 4));
      await settle();
      button('2 new messages').click();
      await settle();

      expect(button('new message')).toBeUndefined();
      expect(log.scrollTop).toBe(1_000);

      log.scrollTop = 0;
      log.dispatchEvent(new Event('scroll'));
      messages$.next(messageOf('f', 5));
      await settle();
      log.scrollTop = 900;
      log.dispatchEvent(new Event('scroll'));
      await settle();
      expect(button('new message')).toBeUndefined();
    });
  });

  describe('live changes', () => {
    beforeEach(async () => {
      await show();
    });

    it('adds messages in time order, once, for this place only', async () => {
      messages$.next(messageOf('c', 5));
      messages$.next(messageOf('b', 3));
      messages$.next(messageOf('b', 3));
      messages$.next(messageOf('x', 4, { channelId: 'other' }));
      await settle();

      expect(texts('.chat-message__text')).toEqual([
        'Message a',
        'Message b',
        'Message c',
      ]);
    });

    it('breaks a tie in time by ID', async () => {
      messages$.next(messageOf('b', 0));
      await settle();

      expect(texts('.chat-message__text')).toEqual(['Message a', 'Message b']);
    });

    it('shows a deletion in this place', async () => {
      messages$.next(messageOf('b', 1));
      deleted$.next({ channelId: 'other', messageId: 'a' });
      deleted$.next({ channelId: 'general', messageId: 'a' });
      await settle();

      expect(texts('.chat-message__text--deleted')).toEqual([
        'Message deleted',
      ]);
      expect(texts('.chat-message__text')).toContain('Message b');
    });

    it('says when the reader may no longer read the place', async () => {
      const removed = jest.fn();

      fixture.componentInstance.removed.subscribe(removed);
      removed$.next(OTHER);
      removed$.next(GENERAL);
      await settle();

      expect(removed).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.errorMessage()).toBe(
        'You can no longer read this.',
      );
      fixture.destroy();
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });

  describe('sending', () => {
    beforeEach(async () => {
      await show();
    });

    it('sends on Enter, and starts a new line on Shift+Enter', async () => {
      type('Hail');
      expect(press('Enter', true)).toBe(false);
      expect(socket.send).not.toHaveBeenCalled();

      expect(press('Enter')).toBe(true);
      await settle();

      expect(socket.send).toHaveBeenCalledWith(GENERAL, 'Hail', {
        mentions: [],
      });
      expect(composer().value).toBe('');
      expect(texts('.chat-message__text')).toEqual(['Message a', 'Hail']);
      expect(element.querySelector('.chat-message--pending')).toBeNull();
    });

    it('sends nothing blank, or over the limit, and counts down near it', async () => {
      type('   ');
      press('Enter');
      expect(socket.send).not.toHaveBeenCalled();

      type('x'.repeat(1_800));
      await settle();
      expect(texts('.chat-composer__counter')).toEqual(['200 characters left']);

      type('x'.repeat(2_000));
      await settle();
      expect(texts('.chat-composer__counter')).toEqual(['0 characters left']);

      type('x'.repeat(2_001));
      press('Enter');
      expect(socket.send).not.toHaveBeenCalled();
    });

    it('shows a message as sending until the server has it, replacing it with the echo', async () => {
      let acknowledge: (message: ChatMessage) => void = () => undefined;

      socket.send.mockReturnValue(
        new Promise<ChatMessage>(resolve => (acknowledge = resolve)),
      );
      type('Hail');
      button('Send').click();
      await settle();

      expect(texts('.chat-message--pending .chat-message__time')).toEqual([
        'Sending…',
      ]);

      messages$.next(messageOf('echo', 30, { body: 'Other', mine: true }));
      messages$.next(messageOf('echo2', 31, { body: 'Hail', mine: true }));
      await settle();
      expect(element.querySelector('.chat-message--pending')).toBeNull();

      acknowledge(messageOf('echo2', 31, { body: 'Hail', mine: true }));
      await settle();
      expect(texts('.chat-message__text')).toEqual([
        'Message a',
        'Other',
        'Hail',
      ]);
    });

    it('marks only the refused one of two sending', async () => {
      socket.send
        .mockImplementationOnce(() => new Promise<ChatMessage>(() => undefined))
        .mockImplementationOnce(rejecting(new ChatSocketError(403, 'No')));
      type('First');
      press('Enter');
      type('Second');
      press('Enter');
      await settle();

      expect(texts('.chat-message--pending .chat-message__time')).toEqual([
        'Sending…',
        'Not sent',
      ]);
    });

    it('shows a refusal, and sends again or discards it', async () => {
      socket.send.mockImplementationOnce(
        rejecting(
          new ChatSocketError(
            429,
            'Slow down: at most 10 messages every ten seconds.',
          ),
        ),
      );
      type('Hail');
      press('Enter');
      await settle();

      expect(texts('.chat-message__failure')).toEqual([
        'Slow down: at most 10 messages every ten seconds.',
      ]);
      button('Try again').click();
      await settle();
      expect(socket.send).toHaveBeenCalledTimes(2);
      expect(texts('.chat-message__failure')).toEqual([]);

      socket.send.mockImplementationOnce(
        rejecting(new ChatSocketError(403, 'No')),
      );
      type('Again');
      press('Enter');
      await settle();
      button('Discard').click();
      await settle();

      expect(element.querySelector('.chat-message--pending')).toBeNull();
    });

    it('answers a message, and stops answering on Escape or the cross', async () => {
      button('Reply').click();
      await settle();
      expect(texts('.chat-composer__reply')).toEqual(['Replying to Kira']);

      expect(press('Escape')).toBe(true);
      await settle();
      expect(element.querySelector('.chat-composer__reply')).toBeNull();
      expect(press('Escape')).toBe(false);

      button('Reply').click();
      await settle();
      (
        element.querySelector(
          '[aria-label="Stop replying"]',
        ) as HTMLButtonElement
      ).click();
      await settle();
      expect(element.querySelector('.chat-composer__reply')).toBeNull();

      button('Reply').click();
      type('Aye');
      press('Enter');
      await settle();

      expect(socket.send).toHaveBeenCalledWith(GENERAL, 'Aye', {
        mentions: [],
        replyToMessageId: 'a',
      });
    });
  });

  describe('mentions', () => {
    beforeEach(async () => {
      await show();
      jest.useFakeTimers();
      fakeTime = true;
    });

    afterEach(() => {
      fakeTime = false;
    });

    const advance = async (): Promise<void> => {
      await jest.advanceTimersByTimeAsync(200);
      await settle();
    };

    it('offers people who can read the channel, and puts the one picked in', async () => {
      type('Hail @Ki');
      await advance();

      expect(chat.people).toHaveBeenCalledWith('general', 'Ki');
      expect(texts('.chat-composer__mention')).toEqual(['Kira']);
      expect(composer().getAttribute('aria-expanded')).toBe('true');

      expect(press('Enter')).toBe(true);
      await settle();
      expect(composer().value).toBe('Hail @Kira ');
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();

      press('Enter');
      await settle();
      expect(socket.send).toHaveBeenCalledWith(GENERAL, 'Hail @Kira', {
        mentions: ['kira'],
      });
    });

    it('moves through the list with the arrows, and picks with Tab or the mouse', async () => {
      chat.people.mockReturnValue(of([KIRA, ODO]));
      type('@');
      await advance();
      expect(chat.people).not.toHaveBeenCalled();

      type('@o');
      await advance();
      press('ArrowDown');
      await settle();
      expect(
        element.querySelector('[aria-selected="true"]')?.textContent?.trim(),
      ).toBe('Odo');
      // Down wraps to the first; up wraps to the last.
      press('ArrowDown');
      press('ArrowUp');
      await settle();
      expect(composer().getAttribute('aria-activedescendant')).toBe(
        'chat-mention-1',
      );

      expect(press('Tab')).toBe(true);
      expect(composer().value).toBe('@Odo ');

      type('@Odo and @o');
      await advance();
      element
        .querySelector('.chat-composer__mention')
        ?.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }));
      expect(composer().value).toBe('@Odo and @Kira ');
    });

    it('closes the list on Escape, and lets other keys through', async () => {
      type('@Ki');
      await advance();

      expect(press('a')).toBe(false);
      expect(press('Escape')).toBe(true);
      await settle();
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();
    });

    it('offers nothing when the lookup fails, or once the mention is finished', async () => {
      chat.people.mockReturnValue(throwError(() => new Error('offline')));
      type('@Ki');
      await advance();
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();

      chat.people.mockReturnValue(of([KIRA]));
      type('@Kir');
      type('@Kira done');
      await advance();
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();
    });

    it('offers only the friend in a conversation', async () => {
      fixture.componentRef.setInput('place', { conversationId: 'talk' });
      fixture.componentRef.setInput('partner', ODO);
      await settle();

      type('@o');
      await settle();
      expect(texts('.chat-composer__mention')).toEqual(['Odo']);

      type('@k');
      await settle();
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();

      fixture.componentRef.setInput('partner', { userId: 'x', username: null });
      type('@');
      await settle();
      expect(element.querySelector('.chat-composer__mentions')).toBeNull();
      expect(chat.people).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('deletes the reader’s own message once confirmed', async () => {
      page = { messages: [messageOf('a', 0, { mine: true })], before: null };
      await show();

      dialogResult = false;
      button('Delete').click();
      expect(chat.remove).not.toHaveBeenCalled();

      dialogResult = true;
      button('Delete').click();
      await settle();

      expect(chat.remove).toHaveBeenCalledWith('a', undefined);
      expect(texts('.chat-message__text--deleted')).toEqual([
        'Message deleted',
      ]);
    });

    it('says when a message could not be deleted', async () => {
      page = { messages: [messageOf('a', 0, { mine: true })], before: null };
      chat.remove.mockReturnValue(throwError(() => new Error('offline')));
      await show();

      button('Delete').click();
      await settle();

      expect(fixture.componentInstance.errorMessage()).toBe(
        'The message could not be deleted.',
      );
    });

    it('lets a moderator remove somebody else’s message with a reason', async () => {
      await show({ mayModerate: true });

      dialogResult = undefined;
      button('Remove').click();
      expect(chat.remove).not.toHaveBeenCalled();

      dialogResult = 'Off topic';
      button('Remove').click();
      await settle();

      expect(dialog.open).toHaveBeenCalledWith(ChatRemoveDialogComponent, {
        data: { authorName: 'Kira' },
      });
      expect(chat.remove).toHaveBeenCalledWith('a', 'Off topic');
    });

    it('offers no removal to a reader who does not moderate', async () => {
      await show();

      expect(button('Remove')).toBeUndefined();
    });
  });

  describe('reporting (FC-035)', () => {
    const REPORT = { reason: ReportReason.SPAM };

    it('reports somebody else’s message, and thanks the reader', async () => {
      page = {
        messages: [messageOf('a', 0), messageOf('b', 1, { mine: true })],
        before: null,
      };
      await show({ mayReport: true });

      expect(
        [...element.querySelectorAll('button')].filter(each =>
          each.textContent?.includes('Report'),
        ),
      ).toHaveLength(1);

      dialogResult = undefined;
      button('Report').click();
      expect(chat.report).not.toHaveBeenCalled();

      dialogResult = REPORT;
      button('Report').click();
      await settle();

      expect(dialog.open).toHaveBeenCalledWith(ChatReportDialogComponent, {
        data: { authorName: 'Kira' },
      });
      expect(chat.report).toHaveBeenCalledWith('a', REPORT);
      expect(element.textContent).toContain(
        'Thanks, a site admin will look at it.',
      );

      button('OK').click();
      await settle();

      expect(fixture.componentInstance.reportNotice()).toBeNull();
    });

    it.each([
      [409, 'You have already reported this message.'],
      [500, 'The report could not be sent. Try again shortly.'],
    ])('says so when the report is refused with %s', async (status, text) => {
      chat.report.mockReturnValue(throwError(() => ({ status })));
      dialogResult = REPORT;
      await show({ mayReport: true });

      button('Report').click();
      await settle();

      expect(fixture.componentInstance.reportNotice()).toEqual({
        sent: false,
        message: text,
      });
      expect(element.textContent).toContain('Report not sent');
    });

    it('offers no report where the reader may not report', async () => {
      await show();

      expect(button('Report')).toBeUndefined();
    });
  });

  describe('blocks and typing (FC-034)', () => {
    it('shows a hidden message as from somebody the reader can’t see, with nothing to do', async () => {
      page = {
        messages: [
          messageOf('a', 0, { hidden: true, author: null, body: null }),
        ],
        before: null,
      };
      await show({ mayModerate: true });

      expect(texts('.chat-message__text--deleted')).toEqual([
        'Message from a member you can’t see',
      ]);
      expect(element.querySelector('.chat-message__author')).toBeNull();
      expect(element.querySelector('.chat-message__actions')).toBeNull();
    });

    it('says who is writing here, for a few seconds, and not once their message arrives', async () => {
      await show();
      jest.useFakeTimers({ now: new Date('2026-09-29T12:00:00Z') });
      fakeTime = true;

      typing$.next({ channelId: 'other', user: ODO });
      typing$.next({ ...GENERAL, user: ODO });
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual(['Odo is writing…']);

      typing$.next({ ...GENERAL, user: KIRA });
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual([
        'Odo and Kira are writing…',
      ]);

      typing$.next({ ...GENERAL, user: { userId: 'x', username: null } });
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual([
        'Several people are writing…',
      ]);

      messages$.next(messageOf('b', 1, { author: KIRA }));
      messages$.next(messageOf('c', 2, { author: null }));
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual([
        'Odo and Somebody are writing…',
      ]);

      await jest.advanceTimersByTimeAsync(6_000);
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual(['']);
      fakeTime = false;
    });

    it('forgets who was writing when the place changes, or with the component', async () => {
      await show();
      typing$.next({ ...GENERAL, user: ODO });
      await settle();

      fixture.componentRef.setInput('place', OTHER);
      await settle();
      expect(texts('.chat-conversation__typing')).toEqual(['']);

      typing$.next({ ...OTHER, user: ODO });
      await settle();
      fixture.destroy();
    });

    it('says the reader is writing only while they share it and have written something', async () => {
      await show();

      type('   ');
      expect(socket.typing).not.toHaveBeenCalled();
      type('Hail');
      expect(socket.typing).toHaveBeenCalledWith(GENERAL);

      socket.typing.mockClear();
      typingOn = false;
      type('Hail there');
      expect(socket.typing).not.toHaveBeenCalled();
    });
  });

  it('only reads where the reader may not post', async () => {
    await show({ mayPost: false });

    expect(composer()).toBeNull();
    expect(button('Reply')).toBeUndefined();
    expect(texts('.chat-conversation__read-only')).toEqual([
      'You can read this channel, but not post in it.',
    ]);
  });

  it('asks for the list back', async () => {
    await show();

    const back = jest.fn();

    fixture.componentInstance.back.subscribe(back);
    button('All chats').click();

    expect(back).toHaveBeenCalled();
  });
});
