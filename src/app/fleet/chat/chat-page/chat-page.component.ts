import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  catchError,
  EMPTY,
  forkJoin,
  map,
  Observable,
  switchMap,
  take,
} from 'rxjs';

import {
  ChatChannel,
  ChatChannelInput,
  ChatConversation,
  ChatPlace,
  ChatScopeChannels,
  ChatTranscript,
  ChatTranscriptRequest,
  ChatTranscriptStatus,
} from 'src/app/models/fleet-chat.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { saveFile } from 'src/app/shared/utils/save-file.utils';

import {
  ChatChannelDialogComponent,
  ChatChannelDialogData,
} from '../chat-channel-dialog/chat-channel-dialog.component';
import { ChatConversationComponent } from '../chat-conversation/chat-conversation.component';
import { ChatPresenceService } from '../chat-presence.service';
import {
  ChatTranscriptDialogComponent,
  ChatTranscriptDialogData,
} from '../chat-transcript-dialog/chat-transcript-dialog.component';
import { ChatSocketService } from '../chat-socket.service';
import { CHAT_ROLE_LABELS } from '../chat.text';
import { ChatRouteKind } from '../chat.routes';
import { ChatService } from '../chat.service';

/** What the page shows beside the list. */
export type ChatSelection =
  | {
      readonly kind: 'channel';
      readonly place: ChatPlace;
      readonly channel: ChatChannel;
      readonly scope: ChatScopeChannels;
    }
  | {
      readonly kind: 'conversation';
      readonly place: ChatPlace;
      readonly conversation: ChatConversation;
    };

/** What each transcript status is shown as (FC-035). */
const TRANSCRIPT_STATUS_LABELS: Readonly<Record<ChatTranscriptStatus, string>> =
  {
    PENDING: 'Being written',
    READY: 'Ready',
    FAILED: 'Not written',
    EXPIRED: 'Expired',
  };

/**
 * The name a transcript is saved under: letters, digits and hyphens only.
 *
 * @param transcript - The transcript.
 * @returns The file name.
 */
export function transcriptFilename(transcript: ChatTranscript): string {
  const slug =
    transcript.channelName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'channel';

  return `chat-${slug}-${transcript.toAt.slice(0, 10)}.txt`;
}

/** What a scope is called, as a label before its name. */
const SCOPE_LABELS: Readonly<Record<ChatScopeChannels['kind'], string>> = {
  COMMUNITY: 'Community',
  ARMADA: 'Armada',
  FLEET: 'Fleet',
};

/**
 * Chat (FC-033): every channel the reader may read, by Community, Armada and
 * Fleet, and their conversations with friends, with the one chosen beside
 * the list — stacked, one at a time, on a narrow screen.
 *
 * The address says what is open: `/chat/channels/:id` or
 * `/chat/direct/:id`, and a scope's Chat tab's `/chat/fleets/:id` (or
 * `communities`, `armadas`), which opens its first channel. A scope's
 * moderators add, change and archive its custom channels here, and its
 * transcript exporters ask for a channel's transcript and download it for a
 * day (FC-035).
 */
@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.scss'],
  standalone: true,
  imports: [
    AppDatePipe,
    ChatConversationComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsWarningMessageComponent,
    LoadingBarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent {
  private readonly _chat = inject(ChatService);
  private readonly _socket = inject(ChatSocketService);
  private readonly _dialog = inject(MatDialog);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _presence = inject(ChatPresenceService);

  readonly scopeLabels = SCOPE_LABELS;
  readonly roleLabels = CHAT_ROLE_LABELS;
  readonly transcriptStatusLabels = TRANSCRIPT_STATUS_LABELS;

  readonly scopes = signal<ChatScopeChannels[]>([]);
  readonly conversations = signal<ChatConversation[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly transcripts = signal<ChatTranscript[]>([]);
  readonly transcriptError = signal<string | null>(null);

  /** Whether a transcript is still being written. */
  readonly hasPending = computed(() =>
    this.transcripts().some(transcript => transcript.status === 'PENDING'),
  );

  /** Whether the reader may export a transcript anywhere (FC-035). */
  readonly mayExport = computed(() =>
    this.scopes().some(scope => scope.mayExport),
  );

  /** Where the socket stands, for the banner. */
  readonly status = this._socket.status;

  /** The friends in the list who are online (FC-034). */
  readonly online = toSignal(
    toObservable(this.conversations).pipe(
      switchMap(conversations =>
        this._presence.watch(
          conversations
            .map(conversation => conversation.other.username)
            .filter((username): username is string => username !== null),
        ),
      ),
    ),
    { initialValue: new Set<string>() as ReadonlySet<string> },
  );

  /**
   * Whether a friend is online.
   *
   * @param conversation - The conversation with them.
   * @returns True when they are, as the reader may know it.
   */
  isOnline(conversation: ChatConversation): boolean {
    return this.online().has(conversation.other.username as string);
  }

  private readonly _conversation = viewChild(ChatConversationComponent);

  /** What the address asks for. */
  private readonly _address = toSignal(
    this._route.paramMap.pipe(
      map(params => ({
        kind: params.get('kind') as ChatRouteKind | null,
        id: params.get('id'),
      })),
    ),
    { initialValue: { kind: null, id: null } },
  );

  /** What is open beside the list, once the list is read. */
  readonly selection = computed<ChatSelection | null>(() => {
    const { kind, id } = this._address();

    if (kind === 'channels') {
      for (const scope of this.scopes()) {
        const channel = scope.channels.find(each => each.id === id);

        if (channel !== undefined) {
          return {
            kind: 'channel',
            place: { channelId: channel.id },
            channel,
            scope,
          };
        }
      }
    }

    if (kind === 'direct') {
      const conversation = this.conversations().find(each => each.id === id);

      if (conversation !== undefined) {
        return {
          kind: 'conversation',
          place: { conversationId: conversation.id },
          conversation,
        };
      }
    }

    return null;
  });

  /** Whether the address names something the list does not hold. */
  readonly isMissing = computed(
    () =>
      !this.isLoading() &&
      this.errorMessage() === null &&
      (this._address().kind === 'channels' ||
        this._address().kind === 'direct') &&
      this.selection() === null,
  );

  constructor() {
    this.load().subscribe();
    this._route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.openScopeChat());
  }

  /**
   * Whether a channel is the one open.
   *
   * @param channel - The channel.
   * @returns True when it is.
   */
  protected isOpenChannel(channel: ChatChannel): boolean {
    const selection = this.selection();

    return selection?.kind === 'channel' && selection.channel.id === channel.id;
  }

  /**
   * Whether a conversation is the one open.
   *
   * @param conversation - The conversation.
   * @returns True when it is.
   */
  protected isOpenConversation(conversation: ChatConversation): boolean {
    const selection = this.selection();

    return (
      selection?.kind === 'conversation' &&
      selection.conversation.id === conversation.id
    );
  }

  /**
   * Asks for a transcript of a channel (FC-035).
   *
   * @param scope - Its scope.
   * @param channel - The channel.
   */
  protected exportTranscript(
    scope: ChatScopeChannels,
    channel: ChatChannel,
  ): void {
    const data: ChatTranscriptDialogData = {
      channelName: channel.name,
      scopeName: `${SCOPE_LABELS[scope.kind]} ${scope.name}`,
    };

    this._dialog
      .open(ChatTranscriptDialogComponent, { data })
      .afterClosed()
      .pipe(take(1))
      .subscribe((request: ChatTranscriptRequest | undefined) => {
        if (request === undefined) {
          return;
        }

        this.transcriptError.set(null);
        this._chat
          .requestTranscript(channel.id, request)
          .pipe(take(1), takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: transcript =>
              this.transcripts.update(each => [transcript, ...each]),
            error: (error: { error?: { message?: string } }) =>
              this.transcriptError.set(
                error.error?.message ??
                  'The transcript could not be asked for.',
              ),
          });
      });
  }

  /** Reads the reader's transcripts again. */
  protected refreshTranscripts(): void {
    this.loadTranscripts();
  }

  /**
   * Whether a transcript may be downloaded now.
   *
   * @param transcript - The transcript.
   * @returns True while it is written and its day has not passed.
   */
  protected isDownloadable(transcript: ChatTranscript): boolean {
    return (
      transcript.status === 'READY' &&
      transcript.expiresAt !== null &&
      new Date(transcript.expiresAt).getTime() > Date.now()
    );
  }

  /**
   * Downloads a transcript.
   *
   * @param transcript - The transcript.
   */
  protected download(transcript: ChatTranscript): void {
    this.transcriptError.set(null);
    this._chat
      .downloadTranscript(transcript.id)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: file => saveFile(file, transcriptFilename(transcript)),
        error: (error: { status?: number }) => {
          this.transcriptError.set(
            error.status === 410
              ? 'That transcript has expired.'
              : error.status === 403
                ? 'You may no longer export that channel.'
                : 'The transcript could not be downloaded.',
          );
          this.loadTranscripts();
        },
      });
  }

  /** Goes back to the list alone, on a narrow screen. */
  protected showList(): void {
    void this._router.navigate(['/chat']);
  }

  /** Opens chat again here after another tab took its place. */
  protected reconnect(): void {
    this._conversation()?.reopen();
  }

  /**
   * Handles the open place becoming unreadable: reads the list again and
   * goes back to it.
   */
  protected onRemoved(): void {
    this.load().subscribe(() => this.showList());
  }

  /**
   * Adds a custom channel to a scope.
   *
   * @param scope - The scope.
   */
  protected addChannel(scope: ChatScopeChannels): void {
    this.editChannel(scope, null, input =>
      this._chat.create(scope.target, input),
    );
  }

  /**
   * Changes a custom channel.
   *
   * @param scope - Its scope.
   * @param channel - The channel.
   */
  protected changeChannel(
    scope: ChatScopeChannels,
    channel: ChatChannel,
  ): void {
    this.editChannel(scope, channel, input =>
      this._chat.update(scope.target, channel.id, input),
    );
  }

  /**
   * Archives a custom channel, once confirmed.
   *
   * @param scope - Its scope.
   * @param channel - The channel.
   */
  protected archiveChannel(
    scope: ChatScopeChannels,
    channel: ChatChannel,
  ): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Archive ${channel.name}?`,
          message:
            'Nobody will read or post in it again, and its messages go with the usual retention. A new channel may take its place.',
          confirmText: 'Archive',
          cancelText: 'Keep it',
        },
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        this._chat
          .archive(scope.target, channel.id)
          .pipe(take(1), takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: () => {
              if (this.isOpenChannel(channel)) {
                this.showList();
              }

              this.load().subscribe();
            },
            error: () =>
              this.actionError.set(`${channel.name} could not be archived.`),
          });
      });
  }

  /**
   * Opens the channel editor, then saves what it gives back.
   *
   * @param scope - The scope.
   * @param channel - The channel, or null for a new one.
   * @param save - How to save it.
   */
  private editChannel(
    scope: ChatScopeChannels,
    channel: ChatChannel | null,
    save: (input: ChatChannelInput) => Observable<ChatChannel>,
  ): void {
    const data: ChatChannelDialogData = { scopeName: scope.name, channel };

    this._dialog
      .open(ChatChannelDialogComponent, { data })
      .afterClosed()
      .pipe(take(1))
      .subscribe((input: ChatChannelInput | undefined) => {
        if (input === undefined) {
          return;
        }

        this.actionError.set(null);
        save(input)
          .pipe(take(1), takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: saved => {
              this.load().subscribe(() =>
                this._router.navigate(['/chat', 'channels', saved.id]),
              );
            },
            error: (error: { error?: { message?: string } }) =>
              this.actionError.set(
                error.error?.message ?? 'The channel could not be saved.',
              ),
          });
      });
  }

  /**
   * Reads the reader's channels and conversations.
   *
   * @returns When done.
   */
  private load(): Observable<void> {
    return forkJoin([this._chat.channels(), this._chat.conversations()]).pipe(
      map(([scopes, conversations]) => {
        this.scopes.set(scopes);
        this.conversations.set(conversations);
        this.errorMessage.set(null);
        this.isLoading.set(false);
        this.openScopeChat();

        if (this.mayExport()) {
          this.loadTranscripts();
        }
      }),
      catchError((error: { status?: number }) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          error.status === 404
            ? 'Chat is not switched on.'
            : 'Chat could not be read. Try again shortly.',
        );

        return EMPTY;
      }),
      takeUntilDestroyed(this._destroyRef),
    );
  }

  /** Reads the transcripts the reader asked for in the last day. */
  private loadTranscripts(): void {
    this._chat
      .transcripts()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: transcripts => this.transcripts.set(transcripts),
        error: () =>
          this.transcriptError.set('Your transcripts could not be read.'),
      });
  }

  /**
   * Opens a scope's first channel when the address names the scope, as its
   * Chat tab does.
   */
  private openScopeChat(): void {
    const { kind, id } = this._address();
    const key =
      kind === 'communities'
        ? 'communityId'
        : kind === 'fleets'
          ? 'fleetId'
          : kind === 'armadas'
            ? 'armadaId'
            : null;

    if (key === null || this.isLoading()) {
      return;
    }

    const scope = this.scopes().find(
      each =>
        each.target[key] === id &&
        (key !== 'communityId' ||
          (each.target.fleetId === null && each.target.armadaId === null)),
    );
    const first = scope?.channels[0];

    void this._router.navigate(
      first === undefined ? ['/chat'] : ['/chat', 'channels', first.id],
      { replaceUrl: true },
    );
  }
}
