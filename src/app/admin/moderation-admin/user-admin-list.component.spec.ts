import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  ModeratedUser,
  PaginatedModeratedUsers,
} from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { UserAdminListComponent } from './user-admin-list.component';

const MEMBER_ID = 'member-1';

/**
 * Builds a member fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member-shaped test fixture.
 */
function buildUser(overrides: Partial<ModeratedUser> = {}): ModeratedUser {
  return {
    id: MEMBER_ID,
    email: 'member@example.com',
    username: 'member',
    role: 'USER',
    isAccountDisabled: false,
    disabledAt: null,
    disabledReason: null,
    lastLoginAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-01-14T09:21:00.000Z',
    openReportCount: 0,
    ...overrides,
  };
}

/**
 * Builds a page of members.
 *
 * @param items - The members on the page.
 * @returns A paginated-members fixture.
 */
function buildPage(items: ModeratedUser[]): PaginatedModeratedUsers {
  return { items, total: items.length, page: 1, pageSize: 20 };
}

describe('UserAdminListComponent', () => {
  let component: UserAdminListComponent;
  let fixture: ComponentFixture<UserAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<ModerationService, 'getUsers' | 'disableUser' | 'enableUser'>
  >;
  let dialogSpy: jest.Mocked<MatDialog>;

  /**
   * Stubs the confirm dialog to close with the given result.
   *
   * @param confirmed - Whether the administrator confirmed.
   */
  const stubDialog = (confirmed: boolean): void => {
    dialogSpy.open.mockReturnValue({
      afterClosed: jest.fn().mockReturnValue(of(confirmed)),
    } as unknown as MatDialogRef<unknown>);
  };

  beforeEach(async () => {
    serviceSpy = {
      getUsers: jest.fn(() => of(buildPage([]))),
      disableUser: jest.fn(() => of(buildUser({ isAccountDisabled: true }))),
      enableUser: jest.fn(() => of(buildUser())),
    };

    dialogSpy = { open: jest.fn() } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [UserAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: ModerationService, useValue: serviceSpy },
      ],
    })
      .overrideComponent(UserAdminListComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserAdminListComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads members on init with no state filter', () => {
    fixture.detectChanges();

    expect(serviceSpy.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: undefined }),
    );
    expect(component.isLoading).toBe(false);
  });

  it('asks for active members only', () => {
    fixture.detectChanges();
    component.disabledFilter = 'ACTIVE';

    component.applyFilters();

    expect(serviceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('asks for disabled members only', () => {
    fixture.detectChanges();
    component.disabledFilter = 'DISABLED';

    component.applyFilters();

    expect(serviceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('sends a trimmed search term, or none at all', () => {
    fixture.detectChanges();
    component.search = '  picard  ';
    component.applyFilters();

    expect(serviceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'picard' }),
    );

    component.search = '   ';
    component.applyFilters();

    expect(serviceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined }),
    );
  });

  it('sets an error when loading fails', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load members.');
  });

  it('handles a malformed page without hanging loading', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      of(null as unknown as PaginatedModeratedUsers),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.users).toEqual([]);
    expect(component.total).toBe(0);
  });

  it('clears loading when the request hangs', () => {
    serviceSpy.getUsers.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading members is taking longer than expected. Please try again.',
    );
  });

  it('skips the timeout fallback once loading has already finished', () => {
    serviceSpy.getUsers.mockReturnValueOnce(NEVER);
    fixture.detectChanges();
    component.isLoading = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('disables a member after confirmation and reloads', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.getUsers.mockClear();

    component.disable(buildUser());

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(serviceSpy.disableUser).toHaveBeenCalledWith(MEMBER_ID);
    expect(serviceSpy.getUsers).toHaveBeenCalled();
    expect(component.successMessage).toContain('disabled');
  });

  it('does not disable when the administrator cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.disable(buildUser());

    expect(serviceSpy.disableUser).not.toHaveBeenCalled();
  });

  it('restores a member after confirmation', () => {
    fixture.detectChanges();
    stubDialog(true);

    component.enable(buildUser({ isAccountDisabled: true }));

    expect(serviceSpy.enableUser).toHaveBeenCalledWith(MEMBER_ID);
    expect(component.successMessage).toContain('restored');
  });

  it('does not restore when the administrator cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.enable(buildUser());

    expect(serviceSpy.enableUser).not.toHaveBeenCalled();
  });

  it('explains a refusal to moderate an administrator account', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.disableUser.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }),
      ),
    );

    component.disable(buildUser({ role: 'ADMIN' }));

    expect(component.errorMessage).toBe(
      'Administrator accounts, including your own, cannot be moderated.',
    );
  });

  it('explains a refusal to moderate your own account', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.enableUser.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }),
      ),
    );

    component.enable(buildUser());

    expect(component.errorMessage).toBe(
      'Administrator accounts, including your own, cannot be moderated.',
    );
  });

  it('falls back to the generic failure for any other error', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.disableUser.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    component.disable(buildUser());

    expect(component.errorMessage).toBe('Failed to disable that account.');
  });

  it('falls back to the email when a member never set a username', () => {
    expect(component.displayName(buildUser({ username: null }))).toBe(
      'member@example.com',
    );
    expect(component.displayName(buildUser())).toBe('member');
  });

  it('renders an active member with their details', () => {
    serviceSpy.getUsers.mockReturnValueOnce(of(buildPage([buildUser()])));

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('member@example.com');
    expect(text).toContain('Active');
    expect(text).toContain('USER');
  });

  it('shows when and why a disabled member was locked out', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      of(
        buildPage([
          buildUser({
            isAccountDisabled: true,
            disabledAt: '2026-08-02T00:00:00.000Z',
            disabledReason: 'Spamming',
          }),
        ]),
      ),
    );

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Disabled');
    expect(text).toContain('Spamming');
  });

  it('says so when a disabled member has no recorded reason', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      of(
        buildPage([
          buildUser({
            isAccountDisabled: true,
            disabledAt: '2026-08-02T00:00:00.000Z',
          }),
        ]),
      ),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('None recorded');
  });

  it('says so when a member has never signed in', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildUser({ lastLoginAt: null })])),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Never');
  });

  it('pluralises the open report count', () => {
    serviceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildUser({ openReportCount: 1 })])),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 open report');

    serviceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildUser({ openReportCount: 3 })])),
    );
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 open reports');
  });

  it('reports an empty search', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No members match this search.',
    );
  });
});
