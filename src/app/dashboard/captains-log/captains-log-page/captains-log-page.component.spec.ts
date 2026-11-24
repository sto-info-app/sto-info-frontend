import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Observable, of, throwError } from 'rxjs';

import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import {
  LogEntry,
  LogEntryPage,
  LogEntryType,
} from 'src/app/models/captains-log.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import { CaptainsLogService } from '../captains-log.service';
import {
  CaptainsLogPageComponent,
  LOG_DELETE_FAILED,
  LOG_LOAD_FAILED,
  LOG_PRIVACY_WARNING,
} from './captains-log-page.component';

/**
 * Builds an entry as its author sees it.
 *
 * @param overrides - Whatever the case is about.
 * @returns The entry.
 */
const entry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  id: 'entry-1',
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

/**
 * A page of entries.
 *
 * @param items - What is on it.
 * @param total - How many there are in all.
 * @returns The page.
 */
const page = (
  items: LogEntry[],
  total = items.length,
): LogEntryPage<LogEntry> => ({
  items,
  total,
  page: 1,
  pageSize: 20,
});

describe('CaptainsLogPageComponent (sc-1450)', () => {
  let confirm: ConfirmPromptDouble;
  let log: {
    list: jest.Mock<Observable<LogEntryPage<LogEntry>>>;
    delete: jest.Mock<Observable<void>>;
  };
  let privacyOn: boolean;
  let settingsLoad: jest.Mock;

  /**
   * Opens the page.
   *
   * @returns The page, its element and the router.
   */
  const render = () => {
    const fixture = TestBed.createComponent(CaptainsLogPageComponent);
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
      navigate,
    };
  };

  beforeEach(() => {
    confirm = stubConfirmPrompt();
    privacyOn = false;
    settingsLoad = jest.fn(() => of({}));
    log = {
      list: jest.fn(() => of(page([entry()]))),
      delete: jest.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [CaptainsLogPageComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: CaptainsLogService, useValue: log },
        {
          provide: PrivacyModeService,
          useValue: { load: settingsLoad, isEnabled: () => privacyOn },
        },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  it('opens straight away with privacy mode off, newest entries first', () => {
    const { element } = render();

    expect(confirm.dialog.open).not.toHaveBeenCalled();
    expect(log.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(element.querySelector('h1')!.textContent).toContain("Captain's Log");
    expect(element.textContent).toContain('Arrival');
    expect(element.textContent).toContain("Captain's");
    expect(
      element.querySelector('a[href="/dashboard/log/entry-1/edit"]'),
    ).not.toBeNull();
    expect(
      element.querySelector('a[href="/dashboard/log/new"]'),
    ).not.toBeNull();
  });

  it('asks first with privacy mode on, and opens once the member agrees', () => {
    privacyOn = true;

    const { component } = render();

    expect(confirm.lastAsked()).toEqual(LOG_PRIVACY_WARNING);
    expect(component.opened()).toBeTrue();
    expect(log.list).toHaveBeenCalled();
  });

  it('goes back to the Dashboard, reading nothing, when the member says no', () => {
    privacyOn = true;
    confirm.answer(false);

    const { component, element, navigate } = render();

    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.opened()).toBeFalse();
    expect(log.list).not.toHaveBeenCalled();
    expect(element.textContent).not.toContain('Arrival');
  });

  it('still asks when the settings cannot be read', () => {
    settingsLoad.mockReturnValue(throwError(() => new Error('offline')));
    privacyOn = true;

    render();

    expect(confirm.lastAsked()?.title).toBe('Privacy mode is on');
  });

  it('shows one type of entry from the first page, and turns pages', () => {
    log.list.mockReturnValue(of(page([entry()], 45)));

    const { component, fixture, element } = render();

    expect(component.pageCount()).toBe(3);
    component.turn(1);
    expect(log.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });

    const personal = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.includes('Personal entries'),
    )!;

    personal.click();
    fixture.detectChanges();

    expect(log.list).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      type: LogEntryType.PERSONAL,
    });
    expect(personal.getAttribute('aria-pressed')).toBe('true');
  });

  it('says so when there are no entries yet', () => {
    log.list.mockReturnValue(of(page([])));

    expect(render().element.textContent).toContain('No entries yet.');
  });

  it('says so when the Log cannot be read', () => {
    log.list.mockReturnValue(throwError(() => new Error('offline')));

    const { component, element } = render();

    expect(component.errorMessage()).toBe(LOG_LOAD_FAILED);
    expect(component.isLoading()).toBeFalse();
    expect(element.textContent).not.toContain('No entries yet.');
  });

  it('marks an entry moderators removed, with their reason, and offers no Edit', () => {
    log.list.mockReturnValue(
      of(
        page([
          entry({
            removedAt: '2026-11-25T08:00:00.000Z',
            removedReason: 'Spoilers',
          }),
        ]),
      ),
    );

    const { element } = render();

    expect(element.textContent).toContain('Removed by moderators');
    expect(element.textContent).toContain('Spoilers');
    expect(
      element.querySelector('a[href="/dashboard/log/entry-1/edit"]'),
    ).toBeNull();
  });

  it('deletes an entry once asked, and reads the page again', () => {
    const { component } = render();

    component.onDelete(entry());

    expect(confirm.lastAsked()?.title).toBe('Delete this entry?');
    expect(confirm.lastAsked()?.message).toContain('Arrival');
    expect(log.delete).toHaveBeenCalledWith('entry-1');
    expect(log.list).toHaveBeenCalledTimes(2);
  });

  it('deletes nothing when the member thinks better of it', () => {
    const { component } = render();

    confirm.answer(false);
    component.onDelete(entry());

    expect(log.delete).not.toHaveBeenCalled();
  });

  it('says so when an entry cannot be deleted', () => {
    log.delete.mockReturnValue(throwError(() => new Error('offline')));

    const { component } = render();

    component.onDelete(entry());

    expect(component.errorMessage()).toBe(LOG_DELETE_FAILED);
  });
});
