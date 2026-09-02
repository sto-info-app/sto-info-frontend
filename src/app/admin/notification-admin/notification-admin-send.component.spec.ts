import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
  NotificationTarget,
  UserSearchResult,
} from 'src/app/models/notification.models';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { NotificationService } from 'src/app/notifications/notification.service';
import { AdminUserSearchService } from '../admin-user-search.service';
import { NotificationAdminSendComponent } from './notification-admin-send.component';

describe('NotificationAdminSendComponent', () => {
  let component: NotificationAdminSendComponent;
  let fixture: ComponentFixture<NotificationAdminSendComponent>;
  let serviceSpy: jest.Mocked<Pick<NotificationService, 'createNotification'>>;
  let userSearchService: { search: jest.Mock };
  let dialog: { open: jest.Mock };
  let dialogRef: { afterClosed: jest.Mock };

  /** Whether the stubbed Privacy Mode is on. Flipped by the tests that care. */
  let isPrivacyModeOn: boolean;

  /** Whether reading the stubbed Privacy Mode setting fails. */
  let privacyModeLoadFails: boolean;

  beforeEach(async () => {
    const createdNotification: AppNotification = {
      id: '1',
      target: NotificationTarget.BROADCAST,
      userId: null,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
      linkUrl: null,
      createdAt: '',
      isRead: false,
      readAt: null,
    };

    serviceSpy = {
      createNotification: jest.fn<
        ReturnType<NotificationService['createNotification']>,
        Parameters<NotificationService['createNotification']>
      >(() => of(createdNotification)),
    };
    dialogRef = {
      afterClosed: jest.fn().mockReturnValue(of(undefined)),
    };
    dialog = {
      open: jest.fn().mockReturnValue(dialogRef),
    };
    userSearchService = {
      search: jest
        .fn()
        .mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 5 })),
    };
    isPrivacyModeOn = true;
    privacyModeLoadFails = false;

    await TestBed.configureTestingModule({
      imports: [NotificationAdminSendComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
        { provide: AdminUserSearchService, useValue: userSearchService },
        {
          provide: PrivacyModeService,
          useValue: {
            isEnabled: (): boolean => isPrivacyModeOn,
            load: (): ReturnType<PrivacyModeService['load']> =>
              privacyModeLoadFails
                ? throwError(() => new Error('Setting unavailable'))
                : of({ privacyMode: isPrivacyModeOn }),
          },
        },
      ],
    })
      .overrideComponent(NotificationAdminSendComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialog }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotificationAdminSendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends a valid broadcast notification and routes to the sent list', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.patchValue({
      target: NotificationTarget.BROADCAST,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
    });
    component.send();

    expect(serviceSpy.createNotification).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/notifications']);
  });

  it('surfaces an error and clears saving when the send fails', () => {
    serviceSpy.createNotification.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.form.patchValue({
      target: NotificationTarget.BROADCAST,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
    });
    component.send();

    expect(component.errorMessage).toBe('Failed to send the notification.');
    expect(component.isSaving).toBe(false);
  });

  it('builds a user-targeted payload with trimmed userId and link', () => {
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.patchValue({
      target: NotificationTarget.USER,
      severity: NotificationSeverity.WARNING,
      title: 'Title',
      body: 'Body',
      userId: '  user-1  ',
      linkUrl: '  https://example.com  ',
    });
    component.send();

    expect(serviceSpy.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        target: NotificationTarget.USER,
        severity: NotificationSeverity.WARNING,
        userId: 'user-1',
        linkUrl: 'https://example.com',
      }),
    );
  });

  it('requires a userId for user-targeted notifications', () => {
    component.form.patchValue({
      target: NotificationTarget.USER,
      title: 'Title',
      body: 'Body',
      userId: '',
    });
    component.send();
    expect(serviceSpy.createNotification).not.toHaveBeenCalled();
  });

  describe('search and select recipient picker', () => {
    it('names nobody until a recipient has been chosen', () => {
      expect(component.recipientName).toBe('');
    });

    it('opens dialog with Recipient picker configuration', () => {
      component.openUserPicker();

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Select a Recipient',
            pageSize: 5,
          }),
        }),
      );
    });

    it('delegates searchFn to AdminUserSearchService', () => {
      component.openUserPicker();

      const openedData = dialog.open.mock.calls[0][1].data;
      openedData.searchFn('kirk', 2);

      const testUser: UserSearchResult = {
        id: 'u1',
        username: 'kirk',
        fullName: 'James Kirk',
        role: 'ADMIN',
        lastLoginAt: '2026-05-01T09:00:00.000Z',
      };
      expect(openedData.resultLabel(testUser)).toBe('kirk');
      expect(openedData.resultSublabel(testUser)).toBe('James Kirk');
    });

    // A name and an address are often near-identical between two accounts; the
    // role and the last sign-in are what settle which one is meant.
    it('gives each result its role and last sign-in', () => {
      component.openUserPicker();

      const openedData = dialog.open.mock.calls[0][1].data;
      const facts = openedData.resultFacts({
        id: 'u1',
        username: 'kirk',
        fullName: 'James Kirk',
        role: 'STORYTIME_CURATOR',
        lastLoginAt: '2026-05-01T09:00:00.000Z',
      });

      expect(facts[0]).toEqual({ label: 'Role', value: 'STORYTIME CURATOR' });
      expect(facts[1].label).toBe('Last signed in');
      expect(facts[1].value).toContain('2026');
    });

    // An account that has never been used says so, rather than showing a date
    // that means the opposite of what it looks like.
    it('says so when a member has never signed in', () => {
      component.openUserPicker();

      const openedData = dialog.open.mock.calls[0][1].data;
      const facts = openedData.resultFacts({
        id: 'u2',
        username: 'spock',
        fullName: null,
        role: 'USER',
        lastLoginAt: null,
      });

      expect(facts[1]).toEqual({ label: 'Last signed in', value: 'Never' });
    });

    it('patches userId and selectedUser when a user is chosen', () => {
      const chosenUser: UserSearchResult = {
        id: 'u-100',
        username: 'picard',
        fullName: 'Jean-Luc Picard',
        role: 'USER',
        lastLoginAt: null,
      };
      dialogRef.afterClosed.mockReturnValue(of(chosenUser));

      component.openUserPicker();

      expect(component.form.controls.userId.value).toBe('u-100');
      expect(component.selectedUser).toEqual(chosenUser);
    });

    // The recipient arrives after the dialog has finished closing, long after
    // the click that chose them. Nothing marks this view for checking then, so
    // the panel is only right if choosing a recipient renders the screen
    // itself: the assertions below deliberately never ask the fixture to.
    it('renders the chosen recipient without a further render pass', () => {
      const chosenUser: UserSearchResult = {
        id: 'u-100',
        username: 'picard',
        fullName: 'Jean-Luc Picard',
        role: 'USER',
        lastLoginAt: null,
      };
      dialogRef.afterClosed.mockReturnValue(of(chosenUser));
      component.form.controls.target.setValue(NotificationTarget.USER);
      fixture.detectChanges();

      component.openUserPicker();

      const panel = (fixture.nativeElement as HTMLElement).querySelector(
        '.field-picker',
      );

      expect(panel?.textContent).toContain('picard');
      expect(panel?.textContent).not.toContain('Nobody chosen yet');
    });

    it('leaves userId unchanged when picker is cancelled', () => {
      dialogRef.afterClosed.mockReturnValue(of(undefined));

      component.form.controls.userId.setValue('existing-id');
      component.openUserPicker();

      expect(component.form.controls.userId.value).toBe('existing-id');
    });

    it('clears selectedUser and userId when switching from USER to BROADCAST target', () => {
      component.selectedUser = {
        id: 'u-100',
        username: 'picard',
        fullName: 'Jean-Luc Picard',
        role: 'USER',
        lastLoginAt: null,
      };
      component.form.controls.userId.setValue('u-100');

      component.form.controls.target.setValue(NotificationTarget.BROADCAST);

      expect(component.selectedUser).toBeNull();
      expect(component.form.controls.userId.value).toBe('');
    });
  });

  // A real name is personal data wherever it is shown, and this screen shows
  // one for every recipient an administrator picks. A username is not.
  describe('privacy mode', () => {
    const picard: UserSearchResult = {
      id: 'u-100',
      username: 'picard',
      fullName: 'Jean-Luc Picard',
      role: 'USER',
      lastLoginAt: null,
    };

    const nameless: UserSearchResult = {
      ...picard,
      id: 'u-200',
      fullName: null,
    };

    /**
     * Chooses a recipient and renders the form with them in it.
     *
     * @param user - The recipient to choose.
     */
    const chooseRecipient = (user: UserSearchResult): void => {
      component.form.controls.target.setValue(NotificationTarget.USER);
      component.selectedUser = user;
      component.form.controls.userId.setValue(user.id);
      fixture.detectChanges();
    };

    /**
     * The rendered recipient panel.
     *
     * @returns The element, when the form is targeting one member.
     */
    const recipientPanel = (): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector('.field-picker');

    it('tells the picker which parts of a result are personal data', () => {
      component.openUserPicker();

      const data = dialog.open.mock.calls[0][1].data;

      expect(data.privateTerm).toBe(true);
      expect(data.privateSublabel).toBe(true);
    });

    // The address is gone from both ends of the search: nothing is matched
    // against one, and nothing shows one.
    it('names a recipient by username, with their real name beneath', () => {
      chooseRecipient(picard);

      const panel = recipientPanel();

      expect(component.recipientName).toBe('picard');
      expect(component.recipientRealName).toBe('Jean-Luc Picard');
      expect(panel?.textContent).not.toContain('@');
    });

    it('blurs the recipient real name while privacy mode is on', () => {
      chooseRecipient(picard);

      expect(
        recipientPanel()?.querySelector('.field-picker__meta')?.className,
      ).toContain('privacy-blur');
      // A username is not private, so it is left legible.
      expect(
        recipientPanel()?.querySelector('.field-picker__name')?.className,
      ).not.toContain('privacy-blur');
    });

    // The service starts out enabled, so a setting that cannot be read leaves
    // the names hidden rather than exposing them, and the page's error banner
    // stays free for failures that stop an administrator getting work done.
    it('carries on with names hidden when the setting cannot be read', () => {
      privacyModeLoadFails = true;

      const retried = TestBed.createComponent(NotificationAdminSendComponent);
      retried.detectChanges();

      expect(retried.componentInstance.errorMessage).toBe('');
    });

    it('shows the real name once privacy mode is off', () => {
      isPrivacyModeOn = false;
      chooseRecipient(picard);

      expect(
        recipientPanel()?.querySelector('.field-picker__meta')?.className,
      ).not.toContain('privacy-blur');
    });

    // A member who gave no name leaves the line out rather than blurring an
    // empty one.
    it('leaves the line out for a member who gave no real name', () => {
      chooseRecipient(nameless);

      expect(component.recipientRealName).toBe('');
      expect(recipientPanel()?.querySelector('.field-picker__meta')).toBeNull();
    });
  });
});
