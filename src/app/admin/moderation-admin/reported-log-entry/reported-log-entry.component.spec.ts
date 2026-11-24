import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { Observable, of, throwError } from 'rxjs';

import { CaptainsLogService } from 'src/app/dashboard/captains-log/captains-log.service';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  AdminLogEntry,
  LogEntryType,
} from 'src/app/models/captains-log.models';

import {
  REPORTED_ENTRY_LOAD_FAILED,
  REPORTED_ENTRY_REMOVE_FAILED,
  ReportedLogEntryComponent,
} from './reported-log-entry.component';

/**
 * Builds an entry as a site admin sees it.
 *
 * @param overrides - Whatever the case is about.
 * @returns The entry.
 */
const entry = (overrides: Partial<AdminLogEntry> = {}): AdminLogEntry => ({
  id: 'entry-1',
  userId: 'user-1',
  type: LogEntryType.CAPTAIN,
  headline: 'Arrival',
  customHeadline: 'Arrival',
  body: 'We reached the Azure Nebula.',
  stardate: 104502.57,
  pictureUrls: null,
  pictureAlt: null,
  createdAt: '2026-11-24T10:30:00.000Z',
  editedAt: null,
  removedAt: null,
  removedReason: null,
  ...overrides,
});

/** A report naming an entry. */
@Component({
  standalone: true,
  imports: [ReportedLogEntryComponent],
  template: `<app-reported-log-entry entryId="entry-1" />`,
})
class HostComponent {}

describe('ReportedLogEntryComponent (sc-1450)', () => {
  let log: {
    getForAdmin: jest.Mock<Observable<AdminLogEntry>>;
    removeForAdmin: jest.Mock<Observable<AdminLogEntry>>;
  };
  let dialog: { open: jest.Mock };
  let reason: string | undefined;

  /**
   * Opens the report.
   *
   * @returns The section and its element.
   */
  const render = () => {
    const fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges();

    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      section: fixture.debugElement.children[0]
        .componentInstance as ReportedLogEntryComponent,
    };
  };

  beforeEach(() => {
    reason = 'Spoilers for the new episode';
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(reason) })),
    };
    log = {
      getForAdmin: jest.fn(() => of(entry())),
      removeForAdmin: jest.fn(() =>
        of(
          entry({
            removedAt: '2026-11-25T08:00:00.000Z',
            removedReason: 'Spoilers for the new episode',
          }),
        ),
      ),
    };

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: CaptainsLogService, useValue: log },
        { provide: MatDialog, useValue: dialog },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  it('shows the entry the report names, with the way to remove it', () => {
    const { element } = render();

    expect(log.getForAdmin).toHaveBeenCalledWith('entry-1');
    expect(element.textContent).toContain("Reported Captain's Log entry");
    expect(element.textContent).toContain('Arrival');
    expect(element.textContent).toContain("Captain's");
    expect(element.textContent).toContain('Remove entry');
  });

  it('removes it once a reason is given, and shows it removed', () => {
    const { fixture, element, section } = render();

    section.remove(entry());
    fixture.detectChanges();

    expect(dialog.open.mock.lastCall[1].data).toEqual(
      expect.objectContaining({
        title: 'Remove this entry?',
        confirmText: 'Remove entry',
        confirmTone: 'refuse',
      }),
    );
    expect(log.removeForAdmin).toHaveBeenCalledWith(
      'entry-1',
      'Spoilers for the new episode',
    );
    expect(element.textContent).toContain(
      'Removed: Spoilers for the new episode',
    );
    expect(element.textContent).not.toContain('Remove entry');
  });

  it('removes nothing when no reason is given', () => {
    reason = undefined;

    render().section.remove(entry());

    expect(log.removeForAdmin).not.toHaveBeenCalled();
  });

  it('says so when the entry cannot be read or removed', () => {
    log.removeForAdmin.mockReturnValue(throwError(() => new Error('offline')));

    const { section } = render();

    section.remove(entry());
    expect(section.errorMessage()).toBe(REPORTED_ENTRY_REMOVE_FAILED);

    log.getForAdmin.mockReturnValue(throwError(() => new Error('gone')));

    const { element } = render();

    expect(element.textContent).toContain(REPORTED_ENTRY_LOAD_FAILED);
  });
});
