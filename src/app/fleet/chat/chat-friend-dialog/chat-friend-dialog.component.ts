import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  take,
} from 'rxjs';

import { CommunityService } from 'src/app/community/community.service';
import {
  Friend,
  PaginatedFriends,
} from 'src/app/community/models/community.models';
import { ChatConversation } from 'src/app/models/fleet-chat.models';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import { ChatPresenceService } from '../chat-presence.service';
import { ChatService } from '../chat.service';

/** How many friends are read at a time. */
export const CHAT_FRIEND_PAGE_SIZE = 20;

/** How long typing pauses before the search runs, in milliseconds. */
export const CHAT_FRIEND_SEARCH_DEBOUNCE_MS = 300;

/** One read of the friends: what was asked, and what came back. */
interface FriendsRead {
  readonly term: string;
  readonly page: number;
  /** Null when they could not be read. */
  readonly result: PaginatedFriends | null;
}

/**
 * Picks a friend to message from chat's page: every friend, searched by
 * username, with their picture and whether they are online (FC-034).
 * Choosing one opens the conversation with them, or the one already there,
 * and closes with it; Cancel closes with undefined.
 */
@Component({
  selector: 'app-chat-friend-dialog',
  templateUrl: './chat-friend-dialog.component.html',
  styleUrls: ['./chat-friend-dialog.component.scss'],
  standalone: true,
  imports: [EntityAvatarComponent, MatDialogModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatFriendDialogComponent {
  private readonly _community = inject(CommunityService);
  private readonly _chat = inject(ChatService);
  private readonly _presence = inject(ChatPresenceService);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatFriendDialogComponent, ChatConversation>,
  );

  readonly friendsLink = '/' + APP_ROUTES.COMMUNITY_FRIENDS;

  readonly term = signal('');
  readonly friends = signal<Friend[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  /** The friendship whose conversation is being opened, if any. */
  readonly opening = signal<string | null>(null);
  readonly openError = signal<string | null>(null);

  /** Whether there are friends beyond those shown. */
  readonly hasMore = computed(() => this.friends().length < this.total());

  /** The term the friends shown were found by, for the next page. */
  private _shownTerm = '';
  private _shownPage = 1;

  private readonly _terms = new Subject<string>();
  private readonly _more = new Subject<void>();

  /** The friends shown who are online (FC-034). */
  readonly online = toSignal(
    toObservable(this.friends).pipe(
      switchMap(friends =>
        this._presence.watch(friends.map(friend => friend.member.username)),
      ),
    ),
    { initialValue: new Set<string>() as ReadonlySet<string> },
  );

  constructor() {
    // A search starts again from the first page; Show more reads the page
    // after the last, by the same term. Whichever comes last wins, so a
    // slow page never lands on the results of a newer search.
    merge(
      this._terms.pipe(
        debounceTime(CHAT_FRIEND_SEARCH_DEBOUNCE_MS),
        map(term => term.trim()),
        startWith(''),
        distinctUntilChanged(),
        map(term => ({ term, page: 1 })),
      ),
      this._more.pipe(
        map(() => ({ term: this._shownTerm, page: this._shownPage + 1 })),
      ),
    )
      .pipe(
        switchMap(({ term, page }) => {
          this.isLoading.set(true);
          this.loadFailed.set(false);

          return this._community
            .getFriends({
              search: term === '' ? undefined : term,
              page,
              pageSize: CHAT_FRIEND_PAGE_SIZE,
            })
            .pipe(
              map((result): FriendsRead => ({ term, page, result })),
              catchError(() => of<FriendsRead>({ term, page, result: null })),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(read => this.show(read));
  }

  /**
   * Whether a friend is online.
   *
   * @param friend - The friend.
   * @returns True when they are, as the reader may know it.
   */
  protected isOnline(friend: Friend): boolean {
    return this.online().has(friend.member.username);
  }

  /**
   * Searches the friends as typed.
   *
   * @param value - The search box's value.
   */
  protected search(value: string): void {
    this.term.set(value);
    this._terms.next(value);
  }

  /** Reads the next page of friends. */
  protected showMore(): void {
    this._more.next();
  }

  /**
   * Opens the conversation with a friend, and closes with it.
   *
   * @param friend - The friend.
   */
  protected message(friend: Friend): void {
    this.opening.set(friend.id);
    this.openError.set(null);
    this._chat
      .open({ friendshipId: friend.id })
      .pipe(take(1))
      .subscribe({
        next: conversation => this._dialogRef.close(conversation),
        error: () => {
          this.opening.set(null);
          this.openError.set(
            `The conversation with ${friend.member.username} could not be opened.`,
          );
        },
      });
  }

  /** Closes without opening anything. */
  protected cancel(): void {
    this._dialogRef.close();
  }

  /**
   * Shows what a read of the friends gave.
   *
   * @param read - The read.
   */
  private show({ term, page, result }: FriendsRead): void {
    this.isLoading.set(false);

    if (result === null) {
      this.loadFailed.set(true);

      return;
    }

    this._shownTerm = term;
    this._shownPage = page;
    this.friends.update(shown =>
      page === 1 ? result.items : [...shown, ...result.items],
    );
    this.total.set(result.total);
  }
}
