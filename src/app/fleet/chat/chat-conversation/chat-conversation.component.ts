import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  from,
  of,
  Subject,
  switchMap,
  take,
} from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  ChatMessage,
  ChatPerson,
  ChatPlace,
  ChatPostOptions,
  ChatReportInput,
} from 'src/app/models/fleet-chat.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ChatRemoveDialogComponent } from '../chat-remove-dialog/chat-remove-dialog.component';
import { ChatReportDialogComponent } from '../chat-report-dialog/chat-report-dialog.component';
import { ChatSocketService } from '../chat-socket.service';
import {
  CHAT_COUNTER_FROM,
  CHAT_EDGE_NOTE,
  CHAT_MESSAGE_MAX_LENGTH,
  chatAuthorName,
  chatPlaceKey,
  ChatSegment,
  chatSegmentsOf,
  isGroupedWith,
  isInPlace,
  mentionQueryAt,
  mentionsStillIn,
} from '../chat.text';
import { ChatService } from '../chat.service';

/** A message on screen, with what the log needs to draw it. */
export interface ChatRow {
  readonly message: ChatMessage;
  /** Its text, split so mentions can be marked; empty once deleted. */
  readonly segments: ChatSegment[];
  /** Whether it sits under the one before, without the name again. */
  readonly grouped: boolean;
  /** The day it starts, when the day changes here. */
  readonly day: string | null;
}

/** A message sent but not yet acknowledged, or refused. */
export interface ChatPendingLine {
  readonly localId: number;
  readonly body: string;
  readonly options: ChatPostOptions;
  readonly failure: string | null;
}

/** What became of a report, shown above the log (FC-035). */
export interface ChatReportNotice {
  readonly sent: boolean;
  readonly message: string;
}

/** How close to the bottom counts as reading the latest, in pixels. */
const BOTTOM_SLACK = 48;

/** How long to wait while typing before asking who to mention. */
const MENTION_DEBOUNCE_MS = 200;

/** How long somebody shows as typing after their last signal (FC-034). */
export const CHAT_TYPING_SHOWN_MS = 5_000;

/**
 * One channel or conversation (FC-033): its messages, live, and the
 * composer.
 *
 * Steve's decisions of 28 and 29 September 2026: plain text only — every
 * message is written as text, never markup — with mentions picked from a list
 * of people who can read the place, replies quoting the first 80 characters
 * of what they answer, and system emoji. Enter sends and Shift+Enter starts
 * a new line. Messages go back four hours, and the top says so. Authors
 * delete their own; the place's moderators remove anybody's, with a reason.
 * Readers report others' messages to the site's admins (FC-035), and are
 * thanked, never told the outcome.
 *
 * It joins its place when shown and leaves it when changed or destroyed, and
 * holds no timer or subscription past its own life.
 */
@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.scss'],
  standalone: true,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    LoadingBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatConversationComponent implements OnDestroy {
  private readonly _socket = inject(ChatSocketService);
  private readonly _chat = inject(ChatService);
  private readonly _dialog = inject(MatDialog);
  private readonly _userSettings = inject(UserSettingsService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _date = new AppDatePipe();

  /** The channel or conversation. */
  readonly place = input.required<ChatPlace>();
  /** Its name: the channel's, or the friend's. */
  readonly title = input.required<string>();
  /** What it belongs to, under the title. */
  readonly subtitle = input<string | null>(null);
  /** Whether the reader may post here. */
  readonly mayPost = input(true);
  /** Whether the reader may remove others' messages here. */
  readonly mayModerate = input(false);
  /** Whether the reader may report others' messages here (FC-035). */
  readonly mayReport = input(false);
  /** The friend, in a conversation, to offer as the only mention. */
  readonly partner = input<ChatPerson | null>(null);

  /** The reader may no longer read the place. */
  readonly removed = output<void>();
  /** The reader wants the list back, on a narrow screen. */
  readonly back = output<void>();

  readonly edgeNote = CHAT_EDGE_NOTE;
  readonly maxLength = CHAT_MESSAGE_MAX_LENGTH;

  readonly messages = signal<ChatMessage[]>([]);
  readonly pending = signal<ChatPendingLine[]>([]);
  readonly before = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly isLoadingOlder = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly reportNotice = signal<ChatReportNotice | null>(null);
  readonly draft = signal('');
  readonly replyTo = signal<ChatMessage | null>(null);
  readonly suggestions = signal<ChatPerson[]>([]);
  readonly activeSuggestion = signal(0);
  readonly unseen = signal(0);

  /** Who is writing here now, and until when (FC-034). */
  private readonly _typers = signal<
    ReadonlyMap<string, { readonly name: string; readonly until: number }>
  >(new Map());
  private _typingSweep: ReturnType<typeof setInterval> | null = null;

  /** Who is writing, in words, or null for nobody. */
  readonly typingLine = computed(() => {
    const names = [...this._typers().values()].map(typer => typer.name);

    if (names.length === 0) {
      return null;
    }

    if (names.length > 2) {
      return 'Several people are writing…';
    }

    return names.length === 1
      ? `${names[0]} is writing…`
      : `${names[0]} and ${names[1]} are writing…`;
  });

  /** The people picked from the list for the message being written. */
  private readonly _picked = signal<ChatPerson[]>([]);
  /** The mention being typed, where it starts, and what follows the `@`. */
  private _mentionAt: { start: number; query: string } | null = null;
  private readonly _mentionQueries = new Subject<string>();
  /** Whether the log is at the bottom, so new messages keep it there. */
  private _atBottom = true;
  private _nextLocalId = 1;
  private _joined: ChatPlace | null = null;

  private readonly _log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly _composer =
    viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  /** Each message with what the log needs to draw it. */
  readonly rows = computed<ChatRow[]>(() => {
    const messages = this.messages();

    return messages.map((message, index) => {
      const previous = messages[index - 1];
      const day = this._date.transform(message.createdAt, 'EEEE d MMMM');
      const dayBefore =
        previous === undefined
          ? null
          : this._date.transform(previous.createdAt, 'EEEE d MMMM');

      return {
        message,
        segments:
          message.body === null
            ? []
            : chatSegmentsOf(message.body, message.mentions),
        grouped: day === dayBefore && isGroupedWith(previous, message),
        day: day === dayBefore ? null : day,
      };
    });
  });

  /** How many characters are left, once near the limit. */
  readonly remaining = computed(() => {
    const length = this.draft().length;

    return length >= CHAT_COUNTER_FROM
      ? CHAT_MESSAGE_MAX_LENGTH - length
      : null;
  });

  /** Whether what is written may be sent. */
  readonly maySend = computed(() => {
    const body = this.draft().trim();

    return (
      this.mayPost() &&
      body.length > 0 &&
      this.draft().length <= CHAT_MESSAGE_MAX_LENGTH
    );
  });

  constructor() {
    toObservable(this.place)
      .pipe(
        distinctUntilChanged((a, b) => chatPlaceKey(a) === chatPlaceKey(b)),
        switchMap(place => from(this.open(place))),
        takeUntilDestroyed(),
      )
      .subscribe();

    this._socket.messages$
      .pipe(
        filter(message => isInPlace(message, this.place())),
        takeUntilDestroyed(),
      )
      .subscribe(message => this.receive(message));

    this._socket.typing$
      .pipe(
        filter(typing => chatPlaceKey(typing) === chatPlaceKey(this.place())),
        takeUntilDestroyed(),
      )
      .subscribe(typing => this.noteTyping(typing.user));

    this._socket.deleted$
      .pipe(
        filter(
          deletion => chatPlaceKey(deletion) === chatPlaceKey(this.place()),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(deletion => this.markDeleted(deletion.messageId));

    this._socket.removed$
      .pipe(
        filter(place => chatPlaceKey(place) === chatPlaceKey(this.place())),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this._joined = null;
        this.errorMessage.set('You can no longer read this.');
        this.removed.emit();
      });

    this._mentionQueries
      .pipe(
        // Not distinct: after a pick, the same start may be typed again.
        debounceTime(MENTION_DEBOUNCE_MS),
        switchMap(query => {
          const place = this.place();

          return place.channelId === undefined || query === ''
            ? of([])
            : this._chat
                .people(place.channelId, query)
                .pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe(people => this.offer(people));

    // Keep the latest message in view while the reader is at the bottom.
    afterRenderEffect(() => {
      this.messages();
      this.pending();

      const log = this._log()?.nativeElement;

      if (log !== undefined && this._atBottom) {
        log.scrollTop = log.scrollHeight;
      }
    });
  }

  /**
   * Leaves the place with the component.
   */
  ngOnDestroy(): void {
    if (this._joined !== null) {
      this._socket.leave(this._joined);
    }

    this.stopTypingSweep();
  }

  /**
   * Joins the place again, as after another tab took chat's place.
   */
  reopen(): void {
    void this.open(this.place());
  }

  /**
   * Notes whether the reader is at the bottom of the log.
   */
  protected onScroll(): void {
    const log = this._log()?.nativeElement as HTMLElement;

    this._atBottom =
      log.scrollHeight - log.scrollTop - log.clientHeight <= BOTTOM_SLACK;

    if (this._atBottom) {
      this.unseen.set(0);
    }
  }

  /** Jumps to the latest message. */
  protected toLatest(): void {
    const log = this._log()?.nativeElement as HTMLElement;

    this._atBottom = true;
    this.unseen.set(0);
    log.scrollTop = log.scrollHeight;
  }

  /**
   * Reads the page before the oldest message shown. Offered only while there
   * is one, and not again until it has come.
   */
  protected loadOlder(): void {
    this.isLoadingOlder.set(true);
    this._chat
      .older(this.place(), this.before() as string)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          const shown = new Set(this.messages().map(message => message.id));

          this.messages.update(messages => [
            ...page.messages.filter(message => !shown.has(message.id)),
            ...messages,
          ]);
          this.before.set(page.before);
          this.isLoadingOlder.set(false);
        },
        error: () => {
          this.isLoadingOlder.set(false);
          this.errorMessage.set('Earlier messages could not be read.');
        },
      });
  }

  /**
   * Handles typing: keeps the draft, and offers people when a mention is
   * being typed.
   *
   * @param textarea - The composer.
   */
  protected onInput(textarea: HTMLTextAreaElement): void {
    this.draft.set(textarea.value);

    // Only for a reader who shares their typing (FC-034).
    if (
      textarea.value.trim() !== '' &&
      this._userSettings.current().typingIndicatorsEnabled
    ) {
      this._socket.typing(this.place());
    }

    this._mentionAt = mentionQueryAt(textarea.value, textarea.selectionStart);

    const partner = this.partner();

    if (this._mentionAt === null) {
      this.offer([]);
    } else if (partner !== null) {
      const query = this._mentionAt.query.toLowerCase();

      this.offer(
        partner.username?.toLowerCase().startsWith(query) ? [partner] : [],
      );
    } else {
      this._mentionQueries.next(this._mentionAt.query);
    }
  }

  /**
   * Handles the composer's keys: the mention list while it is open, Enter to
   * send, Shift+Enter for a new line, Escape to stop replying.
   *
   * @param event - The key.
   * @param textarea - The composer.
   */
  protected onKeydown(
    event: KeyboardEvent,
    textarea: HTMLTextAreaElement,
  ): void {
    const offered = this.suggestions();

    if (offered.length > 0) {
      const handled = this.onSuggestionKey(event.key, offered, textarea);

      if (handled) {
        event.preventDefault();

        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    } else if (event.key === 'Escape' && this.replyTo() !== null) {
      event.preventDefault();
      this.replyTo.set(null);
    }
  }

  /**
   * Puts a person into the message being written.
   *
   * @param person - Who.
   * @param textarea - The composer.
   */
  protected pick(person: ChatPerson, textarea: HTMLTextAreaElement): void {
    const at = this._mentionAt as { start: number; query: string };
    const name = `@${person.username} `;
    const value = textarea.value;
    const end = at.start + at.query.length + 1;

    textarea.value = value.slice(0, at.start) + name + value.slice(end);
    textarea.setSelectionRange(at.start + name.length, at.start + name.length);
    textarea.focus();
    this.draft.set(textarea.value);
    this._picked.update(picked => [
      ...picked.filter(each => each.userId !== person.userId),
      person,
    ]);
    this._mentionAt = null;
    this.offer([]);
  }

  /** Sends what is written. */
  protected send(): void {
    if (!this.maySend()) {
      return;
    }

    const body = this.draft().trim();
    const reply = this.replyTo();
    const options: ChatPostOptions = {
      mentions: mentionsStillIn(body, this._picked()),
      ...(reply === null ? {} : { replyToMessageId: reply.id }),
    };

    this.draft.set('');
    this.replyTo.set(null);
    this._picked.set([]);

    // Only the composer sends, so it is there.
    (this._composer() as ElementRef<HTMLTextAreaElement>).nativeElement.value =
      '';

    this._atBottom = true;
    this.post(body, options);
  }

  /**
   * Sends a refused message again.
   *
   * @param line - The refused message.
   */
  protected retry(line: ChatPendingLine): void {
    this.discard(line);
    this.post(line.body, line.options);
  }

  /**
   * Drops a refused message.
   *
   * @param line - The refused message.
   */
  protected discard(line: ChatPendingLine): void {
    this.pending.update(lines =>
      lines.filter(each => each.localId !== line.localId),
    );
  }

  /**
   * Starts a reply to a message.
   *
   * @param message - What it answers.
   */
  protected reply(message: ChatMessage): void {
    this.replyTo.set(message);
    this._composer()?.nativeElement.focus();
  }

  /** Stops replying. */
  protected cancelReply(): void {
    this.replyTo.set(null);
  }

  /**
   * Scrolls to the message a reply answers, if it is shown.
   *
   * @param messageId - The answered message.
   */
  protected showAnswered(messageId: string): void {
    const element = this._log()?.nativeElement.querySelector<HTMLElement>(
      `#chat-message-${messageId}`,
    );

    element?.scrollIntoView({ block: 'center' });
    element?.focus();
  }

  /**
   * Deletes the reader's own message, once confirmed.
   *
   * @param message - The message.
   */
  protected deleteOwn(message: ChatMessage): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete this message?',
          message: 'It will show as deleted to everybody reading here.',
          confirmText: 'Delete',
          cancelText: 'Keep it',
        },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(confirmed => {
        if (confirmed) {
          this.removeMessage(message.id);
        }
      });
  }

  /**
   * Removes somebody else's message, with a reason.
   *
   * @param message - The message.
   */
  protected moderate(message: ChatMessage): void {
    this._dialog
      .open(ChatRemoveDialogComponent, {
        data: { authorName: chatAuthorName(message.author) },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((reason: string | undefined) => {
        if (reason !== undefined) {
          this.removeMessage(message.id, reason);
        }
      });
  }

  /**
   * Reports somebody else's message to the site's admins (FC-035).
   *
   * @param message - The message.
   */
  protected report(message: ChatMessage): void {
    this._dialog
      .open(ChatReportDialogComponent, {
        data: { authorName: chatAuthorName(message.author) },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((input: ChatReportInput | undefined) => {
        if (input === undefined) {
          return;
        }

        this.reportNotice.set(null);
        this._chat
          .report(message.id, input)
          .pipe(take(1), takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: () =>
              this.reportNotice.set({
                sent: true,
                message: 'Thanks, a site admin will look at it.',
              }),
            error: (error: { status?: number }) =>
              this.reportNotice.set({
                sent: false,
                message:
                  error.status === 409
                    ? 'You have already reported this message.'
                    : 'The report could not be sent. Try again shortly.',
              }),
          });
      });
  }

  /** Puts away what became of a report. */
  protected dismissReportNotice(): void {
    this.reportNotice.set(null);
  }

  /**
   * The name to show for an author.
   *
   * @param author - The author.
   * @returns Their username, or a stand-in.
   */
  protected nameOf(author: ChatPerson | null): string {
    return chatAuthorName(author);
  }

  /**
   * Joins a place, leaving the one before, and reads its latest page.
   *
   * @param place - The place.
   */
  private open(place: ChatPlace): Promise<void> {
    if (this._joined !== null) {
      this._socket.leave(this._joined);
    }

    this._joined = null;
    this.messages.set([]);
    this.pending.set([]);
    this.before.set(null);
    this.errorMessage.set(null);
    this.replyTo.set(null);
    this.unseen.set(0);
    this._typers.set(new Map());
    this.stopTypingSweep();
    this._atBottom = true;
    this.isLoading.set(true);

    // Chained rather than awaited, so the refusal's handler is attached at
    // once and zone.js never takes it for an unhandled rejection.
    return this._socket
      .join(place)
      .then(
        page => {
          this._joined = place;
          this.messages.set(page.messages);
          this.before.set(page.before);
        },
        (error: { status?: number }) => {
          this.errorMessage.set(
            error.status === 404
              ? 'This is not there, or you can no longer read it.'
              : 'Chat could not be reached. It will try again when you come back.',
          );
        },
      )
      .finally(() => this.isLoading.set(false));
  }

  /**
   * Adds a message that arrived live, in time order, replacing its pending
   * copy.
   *
   * @param message - The message.
   */
  private receive(message: ChatMessage): void {
    if (this.messages().some(each => each.id === message.id)) {
      return;
    }

    // Somebody whose message arrives has stopped writing it.
    this.forgetTyper(message.author?.userId);

    // The reader's own message, back from the server: it replaces the first
    // copy still sending.
    if (message.mine) {
      this.pending.update(lines => {
        const index = lines.findIndex(
          line => line.failure === null && line.body === message.body,
        );

        return index === -1
          ? lines
          : [...lines.slice(0, index), ...lines.slice(index + 1)];
      });
    }

    this.messages.update(messages =>
      [...messages, message].sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      ),
    );

    if (!this._atBottom && !message.mine) {
      this.unseen.update(count => count + 1);
    }
  }

  /**
   * Shows a message as deleted.
   *
   * @param messageId - The message.
   */
  private markDeleted(messageId: string): void {
    this.messages.update(messages =>
      messages.map(message =>
        message.id === messageId
          ? {
              ...message,
              body: null,
              deleted: true,
              mentions: [],
              replyTo: null,
            }
          : message,
      ),
    );
  }

  /**
   * Posts, showing the message as pending until it is acknowledged.
   *
   * @param body - What it says.
   * @param options - Who it mentions, and what it answers.
   */
  private post(body: string, options: ChatPostOptions): void {
    const line: ChatPendingLine = {
      localId: this._nextLocalId++,
      body,
      options,
      failure: null,
    };

    this.pending.update(lines => [...lines, line]);
    this._socket
      .send(this.place(), body, options)
      .then(message => {
        this.discard(line);
        this.receive(message);
      })
      .catch((error: Error) => {
        this.pending.update(lines =>
          lines.map(each =>
            each.localId === line.localId
              ? { ...each, failure: error.message }
              : each,
          ),
        );
      });
  }

  /**
   * Deletes a message on the server, and shows it deleted.
   *
   * @param messageId - The message.
   * @param reason - Why, for somebody else's.
   */
  private removeMessage(messageId: string, reason?: string): void {
    this._chat
      .remove(messageId, reason)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => this.markDeleted(messageId),
        error: () => this.errorMessage.set('The message could not be deleted.'),
      });
  }

  /**
   * Shows somebody as writing for a few seconds more.
   *
   * @param user - Who.
   */
  private noteTyping(user: ChatPerson): void {
    this._typers.update(typers =>
      new Map(typers).set(user.userId, {
        name: chatAuthorName(user),
        until: Date.now() + CHAT_TYPING_SHOWN_MS,
      }),
    );

    this._typingSweep ??= setInterval(() => this.sweepTyping(), 1_000);
  }

  /**
   * Stops showing somebody as writing.
   *
   * @param userId - Who, if anybody.
   */
  private forgetTyper(userId: string | undefined): void {
    if (userId !== undefined && this._typers().has(userId)) {
      this._typers.update(typers => {
        const left = new Map(typers);

        left.delete(userId);

        return left;
      });
    }
  }

  /**
   * Drops anybody who has not signalled for a few seconds, and stops looking
   * once nobody is left.
   */
  private sweepTyping(): void {
    const now = Date.now();

    this._typers.update(
      typers => new Map([...typers].filter(([, typer]) => typer.until > now)),
    );

    if (this._typers().size === 0) {
      this.stopTypingSweep();
    }
  }

  /**
   * Stops the typing sweep.
   */
  private stopTypingSweep(): void {
    if (this._typingSweep !== null) {
      clearInterval(this._typingSweep);
      this._typingSweep = null;
    }
  }

  /**
   * Offers people to mention.
   *
   * @param people - Who.
   */
  private offer(people: ChatPerson[]): void {
    this.suggestions.set(this._mentionAt === null ? [] : people);
    this.activeSuggestion.set(0);
  }

  /**
   * Moves through, picks from or closes the mention list.
   *
   * @param key - The key pressed.
   * @param offered - Who is offered.
   * @param textarea - The composer.
   * @returns True when the key was the list's.
   */
  private onSuggestionKey(
    key: string,
    offered: ChatPerson[],
    textarea: HTMLTextAreaElement,
  ): boolean {
    switch (key) {
      case 'ArrowDown':
        this.activeSuggestion.update(index => (index + 1) % offered.length);

        return true;
      case 'ArrowUp':
        this.activeSuggestion.update(
          index => (index - 1 + offered.length) % offered.length,
        );

        return true;
      case 'Enter':
      case 'Tab':
        this.pick(offered[this.activeSuggestion()], textarea);

        return true;
      case 'Escape':
        this._mentionAt = null;
        this.offer([]);

        return true;
      default:
        return false;
    }
  }
}
