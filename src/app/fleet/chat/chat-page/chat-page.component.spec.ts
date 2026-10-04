import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Observable, of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  ChatChannel,
  ChatConversation,
  ChatScopeChannels,
  ChatSocketStatus,
  ChatTranscript,
} from 'src/app/models/fleet-chat.models';
import { FleetConfiguration } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { FLEET_CONFIGURATION } from 'src/app/shared/services/fleet-configuration.testing';
import * as saving from 'src/app/shared/utils/save-file.utils';

import { ChatChannelDialogComponent } from '../chat-channel-dialog/chat-channel-dialog.component';
import { ChatTranscriptDialogComponent } from '../chat-transcript-dialog/chat-transcript-dialog.component';
import { ChatPresenceService } from '../chat-presence.service';
import { ChatSocketService } from '../chat-socket.service';
import { CHAT_ROUTES } from '../chat.routes';
import { ChatService } from '../chat.service';
import { transcriptFilename } from './chat-page.component';

const GENERAL: ChatChannel = {
  id: 'general',
  kind: 'STANDARD',
  name: 'General',
  readRole: 'MEMBER',
  postRole: 'MEMBER',
  mayPost: true,
  mayManage: false,
  mayReport: true,
};
const OFFICERS: ChatChannel = {
  ...GENERAL,
  id: 'officers',
  kind: 'CUSTOM',
  name: 'Officers',
  readRole: 'OFFICER',
  postRole: 'OFFICER',
  mayManage: true,
};
const COMMUNITY: ChatScopeChannels = {
  kind: 'COMMUNITY',
  name: 'Fixture Community',
  path: '/fleets/communities/fixture-community',
  target: { communityId: 'c1', fleetId: null, armadaId: null },
  mayCreate: false,
  mayExport: false,
  channels: [{ ...GENERAL, id: 'community-general' }],
};
const FLEET: ChatScopeChannels = {
  kind: 'FLEET',
  name: 'Fixture Fleet',
  path: '/fleets/communities/fixture-community/fleets/windows/fixture-fleet',
  target: { communityId: 'c1', fleetId: 'f1', armadaId: null },
  mayCreate: true,
  mayExport: false,
  channels: [GENERAL, OFFICERS],
};
const TALK: ChatConversation = {
  id: 'talk',
  other: { userId: 'kira', username: 'Kira' },
};
const HOUR = 3_600_000;

/**
 * A transcript of General.
 *
 * @param overrides - What differs.
 * @returns It.
 */
function transcriptOf(overrides: Partial<ChatTranscript> = {}): ChatTranscript {
  return {
    id: 'transcript-1',
    channelId: 'general',
    channelName: 'General',
    scopeKind: 'FLEET',
    scopeName: 'Fixture Fleet',
    purpose: 'Looking into a complaint',
    fromAt: '2026-09-28T10:00:00.000Z',
    toAt: '2026-09-28T12:00:00.000Z',
    status: 'READY',
    messageCount: 12,
    createdAt: '2026-09-28T12:00:00.000Z',
    readyAt: '2026-09-28T12:01:00.000Z',
    expiresAt: new Date(Date.now() + HOUR).toISOString(),
    ...overrides,
  };
}

describe('ChatPageComponent', () => {
  let chat: {
    channels: jest.Mock;
    conversations: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    archive: jest.Mock;
    older: jest.Mock;
    remove: jest.Mock;
    people: jest.Mock;
    transcripts: jest.Mock;
    requestTranscript: jest.Mock;
    downloadTranscript: jest.Mock;
  };
  let status: ReturnType<typeof signal<ChatSocketStatus>>;
  let removed$: Subject<{ channelId?: string; conversationId?: string }>;
  let socket: Record<string, unknown> & { join: jest.Mock };
  let dialogResults: unknown[];
  let dialog: { open: jest.Mock };
  let harness: RouterTestingHarness;
  let router: Router;
  let configuration: Observable<FleetConfiguration | null>;

  beforeEach(() => {
    chat = {
      channels: jest.fn(() => of([COMMUNITY, FLEET])),
      conversations: jest.fn(() => of([TALK])),
      create: jest.fn(() => of({ ...OFFICERS, id: 'new' })),
      update: jest.fn(() => of(OFFICERS)),
      archive: jest.fn(() => of(undefined)),
      older: jest.fn(),
      remove: jest.fn(),
      people: jest.fn(() => of([])),
      transcripts: jest.fn(() => of([])),
      requestTranscript: jest.fn(() =>
        of(transcriptOf({ id: 'asked', status: 'PENDING', readyAt: null })),
      ),
      downloadTranscript: jest.fn(() => of(new Blob(['text']))),
    };
    status = signal<ChatSocketStatus>('online');
    removed$ = new Subject();
    socket = {
      status,
      messages$: new Subject(),
      deleted$: new Subject(),
      typing$: new Subject(),
      removed$,
      join: jest.fn(() => Promise.resolve({ messages: [], before: null })),
      leave: jest.fn(),
      send: jest.fn(),
    };
    dialogResults = [];
    configuration = of(FLEET_CONFIGURATION);
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogResults.shift()) })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'chat', children: CHAT_ROUTES }]),
        { provide: ChatService, useValue: chat },
        { provide: ChatSocketService, useValue: socket },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ChatPresenceService,
          useValue: { watch: jest.fn(() => of(new Set(['Kira']))) },
        },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
        {
          provide: FleetConfigurationService,
          useValue: { getConfiguration: () => configuration },
        },
      ],
    });
  });

  /**
   * Opens an address and waits for the page to settle.
   *
   * @param url - The address.
   * @returns The page's element.
   */
  async function open(url: string): Promise<HTMLElement> {
    harness ??= await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    await harness.navigateByUrl(url);
    await settle();

    return harness.routeNativeElement as HTMLElement;
  }

  /** Lets navigation, promises and rendering catch up. */
  async function settle(): Promise<void> {
    for (let round = 0; round < 3; round += 1) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
  }

  afterEach(() => {
    harness = undefined as unknown as RouterTestingHarness;
  });

  const texts = (element: HTMLElement, selector: string): string[] =>
    [...element.querySelectorAll(selector)].map(
      each => each.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  const button = (element: HTMLElement, label: string): HTMLButtonElement =>
    [...element.querySelectorAll('button')].find(
      each =>
        each.textContent?.includes(label) ||
        each.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;

  describe('the list', () => {
    it('lists each scope’s channels and the conversations, asking to choose one', async () => {
      const element = await open('/chat');

      expect(texts(element, '.chat-page__scope-name')).toEqual([
        'Community Fixture Community',
        'Fleet Fixture Fleet',
        'Direct messages',
      ]);
      expect(texts(element, '.chat-page__place-link')).toEqual([
        '# General',
        '# General',
        '# Officers Officers and up',
        'Kira (online)',
      ]);
      expect(texts(element, '.chat-page__prompt')).toEqual([
        'Choose a channel or a conversation.',
      ]);
      expect(element.querySelector('.chat-page--open')).toBeNull();
    });

    it('marks the friends who are online (FC-034)', async () => {
      chat.conversations.mockReturnValue(
        of([TALK, { id: 'quiet', other: { userId: 'x', username: null } }]),
      );

      const element = await open('/chat');

      expect(element.querySelectorAll('.chat-presence--online')).toHaveLength(
        1,
      );
      expect(texts(element, '.chat-page__friend')[0]).toBe('Kira (online)');
    });

    it('says when there is nothing to chat in yet', async () => {
      chat.channels.mockReturnValue(of([]));
      chat.conversations.mockReturnValue(of([]));

      const element = await open('/chat');

      expect(texts(element, '.fleet-community-empty')[0]).toContain(
        'You have no chats yet.',
      );
      expect(texts(element, '.chat-page__place-note')).toEqual([
        'Open a conversation from a friend’s profile.',
      ]);
    });

    it.each([
      [{ status: 404 }, 'Chat is not switched on.'],
      [{ status: 500 }, 'Chat could not be read. Try again shortly.'],
    ])('says why the list could not be read', async (error, message) => {
      chat.channels.mockReturnValue(throwError(() => error));

      const element = await open('/chat');

      expect(
        element.querySelector('app-lcars-error-message')?.textContent,
      ).toContain(message);
      expect(element.querySelector('.chat-page__layout')).toBeNull();
    });
  });

  describe('opening', () => {
    it('opens a channel beside the list, marking it', async () => {
      const element = await open('/chat/channels/general');

      expect(socket.join).toHaveBeenCalledWith({ channelId: 'general' });
      expect(texts(element, '.chat-conversation__title')).toEqual([
        '# General Fleet · Fixture Fleet',
      ]);
      expect(
        element.querySelector('[aria-current="page"]')?.textContent,
      ).toContain('General');
      expect(element.querySelector('.chat-page--open')).not.toBeNull();
    });

    it('opens a conversation, naming a friend without a username as Somebody', async () => {
      chat.conversations.mockReturnValue(
        of([TALK, { id: 'quiet', other: { userId: 'x', username: null } }]),
      );

      let element = await open('/chat/direct/talk');

      expect(texts(element, '.chat-conversation__title')).toEqual([
        'Kira Direct messages',
      ]);
      expect(
        element.querySelector('[aria-current="page"]')?.textContent,
      ).toContain('Kira');

      element = await open('/chat/direct/quiet');
      expect(texts(element, '.chat-conversation__title')).toEqual([
        'Somebody Direct messages',
      ]);
    });

    it('says a chat is missing, and goes back to the list', async () => {
      let element = await open('/chat/channels/gone');

      expect(
        texts(element, '.chat-page__open app-lcars-error-message'),
      ).toHaveLength(1);
      button(element, 'All chats').click();
      await settle();
      expect(router.url).toBe('/chat');

      element = await open('/chat/direct/gone');
      expect(element.querySelector('.chat-page--open')).not.toBeNull();
    });

    it.each([
      ['/chat/fleets/f1', '/chat/channels/general'],
      ['/chat/communities/c1', '/chat/channels/community-general'],
      ['/chat/armadas/a1', '/chat'],
    ])('opens a scope’s first channel from %s', async (url, landing) => {
      await open(url);

      expect(router.url).toBe(landing);
    });

    it('goes back to the list from the open place', async () => {
      const element = await open('/chat/channels/general');

      button(element, 'All chats').click();
      await settle();

      expect(router.url).toBe('/chat');
    });

    it('reads the list again and goes back to it when the place is taken away', async () => {
      await open('/chat/channels/general');

      removed$.next({ channelId: 'general' });
      await settle();

      expect(chat.channels).toHaveBeenCalledTimes(2);
      expect(router.url).toBe('/chat');
    });
  });

  describe('the connection', () => {
    it.each([
      ['offline', 'Reconnecting'],
      ['replaced', 'Chat is open elsewhere'],
      ['signedOut', 'Signed out'],
    ])('says when it is %s', async (state, title) => {
      status.set(state as ChatSocketStatus);

      const element = await open('/chat');
      const banner =
        element.querySelector('app-lcars-information-message') ??
        element.querySelector('app-lcars-warning-message');

      expect(banner?.textContent).toContain(title);
    });

    it('opens chat here again after another tab took its place', async () => {
      const element = await open('/chat/channels/general');

      status.set('replaced');
      await settle();
      button(element, 'Use chat here').click();
      await settle();

      expect(socket.join).toHaveBeenCalledTimes(2);
    });

    it('does nothing to reconnect with no place open', async () => {
      status.set('replaced');

      const element = await open('/chat');

      button(element, 'Use chat here').click();

      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('running channels', () => {
    it('adds a channel and opens it', async () => {
      const element = await open('/chat');

      dialogResults = [
        { name: 'Away team', readRole: 'MEMBER', postRole: 'MEMBER' },
      ];
      button(element, 'Add channel').click();
      await settle();

      expect(dialog.open).toHaveBeenCalledWith(ChatChannelDialogComponent, {
        data: { scopeName: 'Fixture Fleet', channel: null },
      });
      expect(chat.create).toHaveBeenCalledWith(FLEET.target, {
        name: 'Away team',
        readRole: 'MEMBER',
        postRole: 'MEMBER',
      });
      expect(router.url).toBe('/chat/channels/new');
    });

    it('changes nothing when the editor is cancelled', async () => {
      const element = await open('/chat');

      dialogResults = [undefined];
      button(element, 'Change Officers').click();

      expect(chat.update).not.toHaveBeenCalled();
    });

    it('changes a channel, and says why the server refused', async () => {
      const element = await open('/chat');

      dialogResults = [{ name: 'Officers', readRole: 'OFFICER' }];
      button(element, 'Change Officers').click();
      await settle();
      expect(chat.update).toHaveBeenCalledWith(FLEET.target, 'officers', {
        name: 'Officers',
        readRole: 'OFFICER',
      });

      chat.update.mockReturnValue(
        throwError(() => ({
          error: { message: 'Another channel here already has that name.' },
        })),
      );
      dialogResults = [{ name: 'General', readRole: 'MEMBER' }];
      button(element, 'Change Officers').click();
      await settle();
      expect(texts(element, 'app-lcars-error-message')[0]).toContain(
        'Channel not saved',
      );

      chat.update.mockReturnValue(throwError(() => ({})));
      dialogResults = [{ name: 'General', readRole: 'MEMBER' }];
      button(element, 'Change Officers').click();
      await settle();
      expect(element.querySelectorAll('app-lcars-error-message')).toHaveLength(
        1,
      );
    });

    it('archives a channel once confirmed, going back to the list if it was open', async () => {
      const element = await open('/chat/channels/officers');

      dialogResults = [false];
      button(element, 'Archive Officers').click();
      expect(chat.archive).not.toHaveBeenCalled();

      dialogResults = [true];
      button(element, 'Archive Officers').click();
      await settle();

      expect(chat.archive).toHaveBeenCalledWith(FLEET.target, 'officers');
      expect(router.url).toBe('/chat');
      expect(chat.channels).toHaveBeenCalledTimes(2);
    });

    it('archives a channel that is not open, staying where the reader is', async () => {
      const element = await open('/chat/channels/general');

      dialogResults = [true];
      button(element, 'Archive Officers').click();
      await settle();

      expect(router.url).toBe('/chat/channels/general');
    });

    it('says when a channel could not be archived', async () => {
      chat.archive.mockReturnValue(throwError(() => new Error('offline')));

      const element = await open('/chat');

      dialogResults = [true];
      button(element, 'Archive Officers').click();
      await settle();

      expect(texts(element, 'app-lcars-error-message')).toHaveLength(1);
    });
  });

  describe('transcripts (FC-035)', () => {
    const EXPORTING: ChatScopeChannels = { ...FLEET, mayExport: true };

    beforeEach(() => {
      chat.channels.mockReturnValue(of([COMMUNITY, EXPORTING]));
    });

    it('offers no transcripts to a reader who may export nowhere', async () => {
      chat.channels.mockReturnValue(of([COMMUNITY, FLEET]));

      const element = await open('/chat');

      expect(element.textContent).not.toContain('Your transcripts');
      expect(button(element, 'Export a transcript of General')).toBeUndefined();
      expect(chat.transcripts).not.toHaveBeenCalled();
    });

    it('lists the reader’s transcripts, with a download while ready', async () => {
      chat.transcripts.mockReturnValue(
        of([
          transcriptOf(),
          transcriptOf({
            id: 'one',
            status: 'PENDING',
            messageCount: 1,
            scopeName: null,
          }),
          transcriptOf({
            id: 'waiting',
            status: 'PENDING',
            messageCount: null,
            expiresAt: null,
          }),
          transcriptOf({
            id: 'stale',
            expiresAt: new Date(Date.now() - HOUR).toISOString(),
          }),
        ]),
      );

      const element = await open('/chat');

      expect(texts(element, '.chat-page__transcript-status')).toEqual([
        'Ready · 12 messages',
        'Being written · 1 message',
        'Being written',
        'Ready · 12 messages',
      ]);
      expect(
        element.querySelectorAll('.chat-page__transcript-download'),
      ).toHaveLength(1);
      expect(element.textContent).toContain('get a notice when a transcript');
    });

    it('asks for a transcript of a channel, and lists it', async () => {
      const element = await open('/chat');

      expect(element.textContent).toContain('Transcripts you asked for');

      dialogResults = [undefined];
      button(element, 'Export a transcript of General').click();
      expect(chat.requestTranscript).not.toHaveBeenCalled();

      const ask = {
        fromAt: '2026-09-28T10:00:00.000Z',
        toAt: '2026-09-28T12:00:00.000Z',
        purpose: 'Looking into a complaint',
      };

      dialogResults = [ask];
      button(element, 'Export a transcript of General').click();
      await settle();

      expect(dialog.open).toHaveBeenLastCalledWith(
        ChatTranscriptDialogComponent,
        {
          data: {
            channelName: 'General',
            scopeName: 'Fleet Fixture Fleet',
            reachDays: 7,
          },
        },
      );
      expect(chat.requestTranscript).toHaveBeenCalledWith('general', ask);
      expect(texts(element, '.chat-page__transcript-status')).toEqual([
        'Being written · 12 messages',
      ]);
    });

    // FC-044: the reach is the server's figure; without it there is none.
    it('offers no transcript while the Fleet policy is unknown', async () => {
      configuration = of(null);

      const element = await open('/chat');

      button(element, 'Export a transcript of General').click();

      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('says why a transcript could not be asked for', async () => {
      const element = await open('/chat');

      chat.requestTranscript.mockReturnValue(
        throwError(() => ({
          error: { message: 'A transcript reaches back 7 days at most.' },
        })),
      );
      dialogResults = [{}];
      button(element, 'Export a transcript of General').click();
      await settle();
      expect(texts(element, 'app-lcars-error-message')[0]).toContain(
        'A transcript reaches back 7 days at most.',
      );

      chat.requestTranscript.mockReturnValue(throwError(() => ({})));
      dialogResults = [{}];
      button(element, 'Export a transcript of General').click();
      await settle();
      expect(texts(element, 'app-lcars-error-message')[0]).toContain(
        'The transcript could not be asked for.',
      );
    });

    it('downloads a transcript under a safe name', async () => {
      const save = jest
        .spyOn(saving, 'saveFile')
        .mockImplementation(() => undefined);

      chat.transcripts.mockReturnValue(of([transcriptOf()]));

      const element = await open('/chat');

      button(element, 'Download').click();
      await settle();

      expect(chat.downloadTranscript).toHaveBeenCalledWith('transcript-1');
      expect(save).toHaveBeenCalledWith(
        expect.any(Blob),
        'chat-general-2026-09-28.txt',
      );
      save.mockRestore();
    });

    it.each([
      [410, 'That transcript has expired.'],
      [403, 'You may no longer export that channel.'],
      [500, 'The transcript could not be downloaded.'],
    ])(
      'says why a download failed with %s, and reads the list again',
      async (code, message) => {
        chat.transcripts.mockReturnValue(of([transcriptOf()]));
        chat.downloadTranscript.mockReturnValue(
          throwError(() => ({ status: code })),
        );

        const element = await open('/chat');

        button(element, 'Download').click();
        await settle();

        expect(texts(element, 'app-lcars-error-message')[0]).toContain(message);
        expect(chat.transcripts).toHaveBeenCalledTimes(2);
      },
    );

    it('reads the list again on Refresh, and says when it cannot', async () => {
      const element = await open('/chat');

      chat.transcripts.mockReturnValue(throwError(() => new Error('offline')));
      button(element, 'Refresh').click();
      await settle();

      expect(texts(element, 'app-lcars-error-message')[0]).toContain(
        'Your transcripts could not be read.',
      );
    });

    it('names a transcript file by its channel and last day', () => {
      expect(
        transcriptFilename(transcriptOf({ channelName: '<Away team>' })),
      ).toBe('chat-away-team-2026-09-28.txt');
      expect(transcriptFilename(transcriptOf({ channelName: '!!!' }))).toBe(
        'chat-channel-2026-09-28.txt',
      );
    });
  });
});
