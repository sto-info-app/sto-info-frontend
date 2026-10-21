import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ChatTranscript } from 'src/app/models/fleet-chat.models';

import {
  ChatTranscriptsComponent,
  isTranscriptDownloadable,
} from './chat-transcripts.component';

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
    jobFailed: false,
    ...overrides,
  };
}

describe('ChatTranscriptsComponent', () => {
  let fixture: ComponentFixture<ChatTranscriptsComponent>;
  let element: HTMLElement;
  let events: string[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatTranscriptsComponent],
      providers: [
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  /**
   * Shows some transcripts.
   *
   * @param transcripts - Them.
   * @param error - Why they could not be read, if so.
   */
  function show(
    transcripts: ChatTranscript[],
    error: string | null = null,
  ): void {
    fixture = TestBed.createComponent(ChatTranscriptsComponent);
    fixture.componentRef.setInput('transcripts', transcripts);
    fixture.componentRef.setInput('error', error);
    events = [];
    fixture.componentInstance.refresh.subscribe(() => events.push('refresh'));
    fixture.componentInstance.back.subscribe(() => events.push('back'));
    fixture.componentInstance.download.subscribe(transcript =>
      events.push(`download ${transcript.id}`),
    );
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  const cells = (row: number): string[] =>
    [
      ...element.querySelectorAll(
        `.chat-transcripts__row:nth-child(${row}) td`,
      ),
    ].map(cell => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const press = (label: string): void =>
    (
      [...element.querySelectorAll('button')].find(
        each =>
          each.getAttribute('aria-label') === label ||
          each.textContent?.trim() === label,
      ) as HTMLButtonElement
    ).click();

  it('lays each out as a row, labelled for a phone', () => {
    show([transcriptOf(), transcriptOf({ id: 'own', scopeName: null })]);

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      'Your transcripts',
    );
    expect(cells(1)).toEqual([
      '# General Fixture Fleet',
      expect.stringMatching(/ to /),
      'Ready',
      '12',
      'Download',
    ]);
    expect(cells(2)[0]).toBe('# General');
    expect(
      [
        ...element.querySelectorAll('.chat-transcripts__row:first-child td'),
      ].map(cell => cell.getAttribute('data-label')),
    ).toEqual(['Channel', 'From – to', 'Status', 'Messages', null]);
  });

  it('refreshes, goes back and downloads on asking', () => {
    show([transcriptOf()]);

    press('Refresh your transcripts');
    press('All chats');
    press('Download the transcript of General');

    expect(events).toEqual(['refresh', 'back', 'download transcript-1']);
  });

  it('says why they could not be read', () => {
    show([], 'Your transcripts could not be read.');

    expect(
      element.querySelector('app-lcars-error-message')?.textContent,
    ).toContain('Your transcripts could not be read.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('offers a download only while one is ready and within its day', () => {
    expect(isTranscriptDownloadable(transcriptOf())).toBe(true);
    expect(isTranscriptDownloadable(transcriptOf({ status: 'PENDING' }))).toBe(
      false,
    );
    expect(isTranscriptDownloadable(transcriptOf({ expiresAt: null }))).toBe(
      false,
    );
    expect(
      isTranscriptDownloadable(
        transcriptOf({ expiresAt: new Date(Date.now() - HOUR).toISOString() }),
      ),
    ).toBe(false);
  });
});
