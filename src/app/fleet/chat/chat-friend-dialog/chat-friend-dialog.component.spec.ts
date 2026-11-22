import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { Observable, of, Subject, throwError } from 'rxjs';

import { CommunityService } from 'src/app/community/community.service';
import {
  Friend,
  FriendsQuery,
  PaginatedFriends,
} from 'src/app/community/models/community.models';
import { ChatConversation } from 'src/app/models/fleet-chat.models';

import { ChatPresenceService } from '../chat-presence.service';
import { ChatService } from '../chat.service';
import {
  CHAT_FRIEND_PAGE_SIZE,
  CHAT_FRIEND_SEARCH_DEBOUNCE_MS,
  ChatFriendDialogComponent,
} from './chat-friend-dialog.component';

/**
 * A friend, by their username.
 *
 * @param username - Who.
 * @param picture - Their picture, if they have one.
 * @returns The friend, whose friendship is named after them.
 */
function friendOf(username: string, picture: string | null = null): Friend {
  return {
    id: `friendship-${username}`,
    friendsSince: '2026-09-01T00:00:00.000Z',
    member: {
      username,
      profilePicture100: picture,
      profilePicture300: null,
      joinedAt: '2026-01-01T00:00:00.000Z',
      lastActiveAt: null,
      playingSince: null,
      publicAccountCount: 0,
      publicCharacterCount: 0,
      publiclyVisible: true,
    },
  };
}

/**
 * A page of friends.
 *
 * @param items - The friends on it.
 * @param total - How many there are in all.
 * @returns The page.
 */
function pageOf(items: Friend[], total = items.length): PaginatedFriends {
  return { items, total, page: 1, pageSize: CHAT_FRIEND_PAGE_SIZE };
}

const KIRA = friendOf('Kira', 'https://example.test/kira.png');
const QUARK = friendOf('Quark');
const ODO = friendOf('Odo');
const TALK: ChatConversation = {
  id: 'talk',
  other: { userId: 'kira', username: 'Kira' },
};

describe('ChatFriendDialogComponent', () => {
  let fixture: ComponentFixture<ChatFriendDialogComponent>;
  let element: HTMLElement;
  let getFriends: jest.Mock<Observable<PaginatedFriends>, [FriendsQuery]>;
  let openConversation: jest.Mock;
  let watch: jest.Mock;
  let close: jest.Mock;

  beforeEach(() => {
    getFriends = jest.fn<Observable<PaginatedFriends>, [FriendsQuery]>(() =>
      of(pageOf([KIRA, QUARK])),
    );
    openConversation = jest.fn(() => of(TALK));
    watch = jest.fn(() => of(new Set(['Kira'])));
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatFriendDialogComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: { getFriends } },
        { provide: ChatService, useValue: { open: openConversation } },
        { provide: ChatPresenceService, useValue: { watch } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Opens the dialog. */
  function show(): void {
    fixture = TestBed.createComponent(ChatFriendDialogComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  const names = (): string[] =>
    [...element.querySelectorAll('.chat-friend-dialog__name')].map(
      each => each.textContent?.trim() ?? '',
    );
  const rows = (): HTMLButtonElement[] => [
    ...element.querySelectorAll<HTMLButtonElement>(
      '.chat-friend-dialog__friend',
    ),
  ];
  const notes = (): string[] =>
    [...element.querySelectorAll('.chat-friend-dialog__note')].map(
      each => each.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  const more = (): HTMLButtonElement | null =>
    element.querySelector('.chat-friend-dialog__more');

  /**
   * Types into the search box, and lets the pause pass.
   *
   * @param value - What is typed.
   */
  function type(value: string): void {
    const input = element.querySelector(
      '#chat-friend-search',
    ) as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
    jest.advanceTimersByTime(CHAT_FRIEND_SEARCH_DEBOUNCE_MS);
    fixture.detectChanges();
  }

  it('lists every friend straight away, with their picture and who is online', () => {
    show();

    expect(getFriends).toHaveBeenCalledWith({
      search: undefined,
      page: 1,
      pageSize: CHAT_FRIEND_PAGE_SIZE,
    });
    expect(names()).toEqual(['Kira', 'Quark']);
    expect(rows().map(row => row.getAttribute('aria-label'))).toEqual([
      'Message Kira (online)',
      'Message Quark',
    ]);
    expect(element.querySelectorAll('.chat-presence--online')).toHaveLength(1);
    expect(watch).toHaveBeenLastCalledWith(['Kira', 'Quark']);
    expect(
      element.querySelector('app-entity-avatar img')?.getAttribute('src'),
    ).toBe('https://example.test/kira.png');
    expect(more()).toBeNull();
    expect(notes()).toEqual([]);
  });

  it('says so while the friends are read', () => {
    getFriends.mockReturnValue(new Subject<PaginatedFriends>());
    show();

    expect(notes()).toEqual(['Reading your friends…']);
  });

  it('searches as typed, once typing pauses, from the first page', () => {
    jest.useFakeTimers();
    show();
    getFriends.mockReturnValue(of(pageOf([QUARK])));

    type('  qua ');

    expect(getFriends).toHaveBeenLastCalledWith({
      search: 'qua',
      page: 1,
      pageSize: CHAT_FRIEND_PAGE_SIZE,
    });
    expect(names()).toEqual(['Quark']);

    // The same words again read nothing.
    type('qua');

    expect(getFriends).toHaveBeenCalledTimes(2);
  });

  it('says when no friend matches, and when there are none at all', () => {
    jest.useFakeTimers();
    getFriends.mockReturnValue(of(pageOf([])));
    show();

    expect(notes()).toEqual([
      'You have no friends to message yet. Find some on the Friends page.',
    ]);
    expect(element.querySelector('a')?.getAttribute('href')).toBe(
      '/community/friends',
    );

    type('Garak');

    expect(notes()).toEqual(['No friends match “Garak”.']);
  });

  it('shows more friends by the same search, until all are shown', () => {
    jest.useFakeTimers();
    getFriends.mockReturnValue(of(pageOf([KIRA, QUARK], 3)));
    show();
    getFriends.mockReturnValue(of(pageOf([ODO], 3)));

    more()?.click();
    fixture.detectChanges();

    expect(getFriends).toHaveBeenLastCalledWith({
      search: undefined,
      page: 2,
      pageSize: CHAT_FRIEND_PAGE_SIZE,
    });
    expect(names()).toEqual(['Kira', 'Quark', 'Odo']);
    expect(more()).toBeNull();
  });

  it('drops a page still coming once a new search starts', () => {
    jest.useFakeTimers();
    getFriends.mockReturnValue(of(pageOf([KIRA, QUARK], 3)));
    show();
    const slow = new Subject<PaginatedFriends>();

    getFriends.mockReturnValueOnce(slow);
    more()?.click();
    getFriends.mockReturnValue(of(pageOf([ODO])));
    type('odo');
    slow.next(pageOf([QUARK], 3));
    fixture.detectChanges();

    expect(names()).toEqual(['Odo']);
  });

  it('says when the friends could not be read', () => {
    getFriends.mockReturnValue(throwError(() => new Error('offline')));
    show();

    expect(notes()).toEqual([
      'Your friends could not be read. Try again shortly.',
    ]);
    expect(rows()).toHaveLength(0);
  });

  it('opens the conversation with a friend and closes with it', () => {
    const opened = new Subject<ChatConversation>();

    openConversation.mockReturnValue(opened);
    show();

    rows()[0].click();
    fixture.detectChanges();

    expect(openConversation).toHaveBeenCalledWith({
      friendshipId: 'friendship-Kira',
    });
    expect(rows().every(row => row.disabled)).toBe(true);
    expect(rows()[0].textContent).toContain('Opening…');

    opened.next(TALK);

    expect(close).toHaveBeenCalledWith(TALK);
  });

  it('says when a conversation could not be opened, letting another be tried', () => {
    openConversation.mockReturnValue(throwError(() => new Error('refused')));
    show();

    rows()[1].click();
    fixture.detectChanges();

    expect(close).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'The conversation with Quark could not be opened.',
    );
    expect(rows().some(row => row.disabled)).toBe(false);
  });

  it('closes with nothing on Cancel', () => {
    show();

    (
      [...element.querySelectorAll('button')].find(
        each => each.textContent?.trim() === 'Cancel',
      ) as HTMLButtonElement
    ).click();

    expect(close).toHaveBeenCalledWith();
  });
});
