import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Observable, of, throwError } from 'rxjs';

import { CaptainsLogService } from 'src/app/dashboard/captains-log/captains-log.service';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  LogEntryPage,
  PublicLogEntry,
} from 'src/app/models/captains-log.models';

import {
  PROFILE_LOG_LOAD_FAILED,
  ProfileCaptainsLogComponent,
} from './profile-captains-log.component';

/** A Captain's entry, as a reader sees it. */
const ENTRY: PublicLogEntry = {
  id: 'entry-1',
  headline: 'Arrival',
  body: 'We reached the Azure Nebula.',
  stardate: 104502.57,
  pictureUrls: null,
  pictureAlt: null,
  createdAt: '2026-11-24T10:30:00.000Z',
  editedAt: null,
};

/**
 * A page of entries.
 *
 * @param items - What is on it.
 * @param total - How many there are in all.
 * @returns The page.
 */
const page = (
  items: PublicLogEntry[],
  total = items.length,
): LogEntryPage<PublicLogEntry> => ({ items, total, page: 1, pageSize: 20 });

/** A profile with the section on it. */
@Component({
  standalone: true,
  imports: [ProfileCaptainsLogComponent],
  template: `
    <app-profile-captains-log
      [username]="username()"
      [canReport]="canReport()"
      (report)="reported.push($event)" />
  `,
})
class HostComponent {
  readonly username = signal('captain.picard');
  readonly canReport = signal(true);
  readonly reported: PublicLogEntry[] = [];
}

describe('ProfileCaptainsLogComponent (sc-1450)', () => {
  let listPublic: jest.Mock<Observable<LogEntryPage<PublicLogEntry>>>;

  /**
   * Opens a profile.
   *
   * @returns The profile, its element and the section.
   */
  const render = () => {
    const fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges();

    return {
      fixture,
      host: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  };

  beforeEach(() => {
    listPublic = jest.fn(() => of(page([ENTRY])));

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: CaptainsLogService, useValue: { listPublic } },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  it('shows the profile’s Captain’s entries under the Log’s name, with a Report button', () => {
    const { element, host } = render();

    expect(listPublic).toHaveBeenCalledWith('captain.picard', 1);
    expect(element.textContent).toContain("Captain's Log");
    expect(element.textContent).toContain('Arrival');

    const report = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Report',
    )!;

    report.click();

    expect(host.reported).toEqual([ENTRY]);
  });

  it('offers no Report button to somebody who may not report', () => {
    const { fixture, host, element } = render();

    host.canReport.set(false);
    fixture.detectChanges();

    expect(
      Array.from(element.querySelectorAll('button')).some(
        button => button.textContent?.trim() === 'Report',
      ),
    ).toBeFalse();
  });

  it('shows nothing at all for a profile with no Captain’s entries', () => {
    listPublic.mockReturnValue(of(page([])));

    expect(render().element.textContent?.trim()).toBe('');
  });

  it('says so when the entries cannot be read', () => {
    listPublic.mockReturnValue(throwError(() => new Error('offline')));

    expect(render().element.textContent).toContain(PROFILE_LOG_LOAD_FAILED);
  });

  it('turns pages, and starts again from the first for another profile', () => {
    listPublic.mockReturnValue(of(page([ENTRY], 45)));

    const { fixture, host, element } = render();
    const older = Array.from(element.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Older'),
    )!;

    older.click();
    fixture.detectChanges();
    expect(listPublic).toHaveBeenLastCalledWith('captain.picard', 2);

    host.username.set('commander.riker');
    fixture.detectChanges();
    expect(listPublic).toHaveBeenLastCalledWith('commander.riker', 1);
  });
});
