import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  ChatTranscriptDialogComponent,
  toLocalInput,
} from './chat-transcript-dialog.component';

const NOW = new Date(2026, 8, 29, 12, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('ChatTranscriptDialogComponent', () => {
  let close: jest.Mock;
  let element: HTMLElement;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['queueMicrotask'] });
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatTranscriptDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            channelName: 'General',
            scopeName: 'Fleet Kira',
            reachDays: 7,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(ChatTranscriptDialogComponent);

    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const field = (id: string): HTMLInputElement =>
    element.querySelector(`#${id}`) as HTMLInputElement;
  const exportButton = (): HTMLButtonElement =>
    element.querySelector('button.green') as HTMLButtonElement;

  /**
   * Sets a field as a person would.
   *
   * @param id - The field.
   * @param value - What to put in it.
   */
  const set = (id: string, value: string): void => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
  };

  it('writes an instant in the device’s time, to the minute', () => {
    expect(toLocalInput(new Date(2026, 0, 5, 7, 3, 59))).toBe(
      '2026-01-05T07:03',
    );
  });

  it('offers the last day, bounded by the last seven days', () => {
    expect(element.textContent).toContain('# General');
    expect(element.textContent).toContain('Fleet Kira');
    expect(field('chat-transcript-from').value).toBe(
      toLocalInput(new Date(NOW.getTime() - DAY)),
    );
    expect(field('chat-transcript-to').value).toBe(toLocalInput(NOW));
    expect(field('chat-transcript-from').getAttribute('min')).toBe(
      toLocalInput(new Date(NOW.getTime() - 7 * DAY + 10 * 60_000)),
    );
    expect(field('chat-transcript-to').getAttribute('max')).toBe(
      toLocalInput(NOW),
    );
  });

  it('needs a purpose of ten characters or more', () => {
    expect(exportButton().disabled).toBe(true);

    set('chat-transcript-purpose', '  Ten chars! ');
    expect(exportButton().disabled).toBe(false);

    set('chat-transcript-purpose', ' Nine char ');
    expect(exportButton().disabled).toBe(true);
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();
  });

  it.each([
    [
      'reaches back past seven days',
      toLocalInput(new Date(NOW.getTime() - 7 * DAY)),
      toLocalInput(NOW),
      'A transcript reaches back seven days at most.',
    ],
    [
      'ends before it starts',
      toLocalInput(NOW),
      toLocalInput(new Date(NOW.getTime() - HOUR)),
      'The end must come after the start.',
    ],
    ['is left empty', '', toLocalInput(NOW), 'Choose when the transcript'],
  ])('refuses a range that %s', (_case, from, to, message) => {
    set('chat-transcript-purpose', 'Looking into a complaint');
    set('chat-transcript-from', from);
    set('chat-transcript-to', to);

    expect(element.textContent).toContain(message);
    expect(exportButton().disabled).toBe(true);
  });

  it('asks for the range as instants, and the purpose trimmed', () => {
    const from = new Date(NOW.getTime() - 2 * HOUR);

    set('chat-transcript-from', toLocalInput(from));
    set('chat-transcript-purpose', '  Looking into a complaint  ');
    exportButton().click();

    expect(close).toHaveBeenCalledWith({
      fromAt: from.toISOString(),
      toAt: NOW.toISOString(),
      purpose: 'Looking into a complaint',
    });
  });

  it('asks for nothing on cancel', () => {
    (element.querySelector('button.red') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });

  // FC-044: the reach is the server's figure, so the words follow it.
  it('says the reach the Fleet policy gives, in words', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ChatTranscriptDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            channelName: 'General',
            scopeName: 'Fleet Kira',
            reachDays: 3,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const shorter = TestBed.createComponent(ChatTranscriptDialogComponent);

    shorter.detectChanges();

    expect(shorter.nativeElement.textContent).toContain(
      'from any time in the last three days',
    );
    expect(
      (
        shorter.nativeElement.querySelector(
          '#chat-transcript-from',
        ) as HTMLInputElement
      ).getAttribute('min'),
    ).toBe(toLocalInput(new Date(NOW.getTime() - 3 * DAY + 10 * 60_000)));

    shorter.componentInstance.fromAt.set(
      toLocalInput(new Date(NOW.getTime() - 3 * DAY)),
    );
    expect(shorter.componentInstance.rangeError()).toBe(
      'A transcript reaches back three days at most.',
    );
  });
});
