import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { PublicLogEntry } from 'src/app/models/captains-log.models';

import { LogEntryCardComponent } from './log-entry-card.component';

/** An entry, as a profile reader sees it. */
const ENTRY: PublicLogEntry = {
  id: 'entry-1',
  headline: 'Arrival',
  body: 'We reached the **Azure Nebula**.',
  stardate: 104502.57,
  pictureUrls: { cover640x360: 'small.jpg', cover1920x1080: 'large.jpg' },
  pictureAlt: 'The nebula',
  createdAt: '2026-11-24T10:30:00.000Z',
  editedAt: null,
};

/** A page drawing a card, with something in each of its slots. */
@Component({
  standalone: true,
  imports: [LogEntryCardComponent],
  template: `
    <app-log-entry-card
      [entry]="entry()"
      [position]="position()"
      [level]="2">
      <span entryMarks>Mark</span>
      <p entryNotes>Note</p>
      <button entryActions>Act</button>
    </app-log-entry-card>
  `,
})
class HostComponent {
  readonly entry = signal(ENTRY);
  readonly position = signal(0);
}

describe('LogEntryCardComponent (sc-1450)', () => {
  /**
   * Draws a card.
   *
   * @returns The page and its element.
   */
  const render = () => {
    const fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges();

    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  it('draws the headline, the picture, the words and when it was written', () => {
    const { element } = render();
    const picture = element.querySelector('img')!;

    expect(element.querySelector('h2')!.textContent).toContain('Arrival');
    expect(picture.getAttribute('src')).toBe('small.jpg');
    expect(picture.getAttribute('alt')).toBe('The nebula');
    expect(element.querySelector('strong')!.textContent).toBe('Azure Nebula');
    expect(element.textContent).toContain('Stardate 104502.6');
    expect(element.textContent).toContain('2026');
    expect(element.textContent).not.toContain('Edited');
  });

  it('puts what the page adds in its marks, notes and actions', () => {
    const { element } = render();

    expect(
      element.querySelector('.log-entry-card__marks')!.textContent,
    ).toContain('Mark');
    expect(element.querySelector('.log-entry-card')!.textContent).toContain(
      'Note',
    );
    expect(
      element.querySelector('.log-entry-card__actions button')!.textContent,
    ).toBe('Act');
  });

  it('says when it was edited, draws no picture it has not got, and rotates its colour', () => {
    const { fixture, element } = render();
    const host = fixture.componentInstance;

    host.entry.set({
      ...ENTRY,
      pictureUrls: null,
      editedAt: '2026-11-25T09:00:00.000Z',
    });
    host.position.set(7);
    fixture.detectChanges();

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('Edited');
    expect(element.querySelector('app-lcars-panel')!.classList).toContain(
      'accent-sunflower',
    );
  });
});
