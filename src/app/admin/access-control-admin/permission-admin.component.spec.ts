import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { UserSettings } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import {
  ADMIN_ROLE,
  ASSIGNABLE_ROLES,
  AdminPermission,
  PermissionEffect,
  SetPermissionOverrideRequest,
  SetUserRoleRequest,
  UserAccessSummary,
  UserPermissionOverride,
} from 'src/app/models/access-control.models';
import {
  ModeratedUser,
  PaginatedModeratedUsers,
} from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { AccessControlAdminService } from 'src/app/shared/services/access-control-admin.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { PermissionAdminComponent } from './permission-admin.component';

const MEMBER_ID = 'member-1';
const MODERATE = 'storytime.moderate';
const SPOTLIGHT = 'storytime.spotlight.manage';
const VIEW = 'storytime.view';

const permissions: AdminPermission[] = [
  {
    id: 'permission-1',
    code: VIEW,
    name: 'View Storytime',
    description: 'Read published Stories.',
    module: 'STORYTIME',
  },
  {
    id: 'permission-2',
    code: MODERATE,
    name: 'Moderate Storytime',
    description: 'Review reports and remove content.',
    module: 'STORYTIME',
  },
  {
    id: 'permission-3',
    code: SPOTLIGHT,
    name: 'Manage Spotlight',
    description: null,
    module: 'STORYTIME',
  },
];

/**
 * Builds a member fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member-shaped test fixture.
 */
function buildMember(overrides: Partial<ModeratedUser> = {}): ModeratedUser {
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
 * @param total - How many members the search matched in all, when it is more
 *   than the page holds.
 * @param page - The 1-based page number the fixture stands for.
 * @returns A paginated-members fixture.
 */
function buildPage(
  items: ModeratedUser[],
  total = items.length,
  page = 1,
): PaginatedModeratedUsers {
  return { items, total, page, pageSize: 5 };
}

/**
 * Builds an override fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns An override-shaped test fixture.
 */
function buildOverride(
  overrides: Partial<UserPermissionOverride> = {},
): UserPermissionOverride {
  return {
    id: 'override-1',
    permissionCode: MODERATE,
    effect: PermissionEffect.GRANT,
    reason: 'Volunteer moderator.',
    grantedByUserId: 'admin-1',
    expiresAt: null,
    createdAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds an access summary.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A summary-shaped test fixture.
 */
function buildSummary(
  overrides: Partial<UserAccessSummary> = {},
): UserAccessSummary {
  return {
    userId: MEMBER_ID,
    role: ASSIGNABLE_ROLES.USER,
    effectivePermissions: [VIEW],
    overrides: [],
    ...overrides,
  };
}

describe('PermissionAdminComponent', () => {
  let component: PermissionAdminComponent;
  let fixture: ComponentFixture<PermissionAdminComponent>;
  let adminServiceSpy: jest.Mocked<
    Pick<
      AccessControlAdminService,
      | 'listPermissions'
      | 'getUserAccessSummary'
      | 'setPermissionOverride'
      | 'removePermissionOverride'
      | 'setUserRole'
    >
  >;
  let moderationServiceSpy: jest.Mocked<Pick<ModerationService, 'getUsers'>>;
  let accessControlServiceSpy: jest.Mocked<
    Pick<AccessControlService, 'refresh'>
  >;
  let dialogSpy: jest.Mocked<MatDialog>;
  let dashboardServiceSpy: jest.Mocked<
    Pick<DashboardService, 'getUserSettings'>
  >;

  /**
   * Finds the Clear button beside the member search, when it is on screen.
   *
   * @returns The button, or undefined when there is nothing to clear.
   */
  const clearButton = (): HTMLButtonElement | undefined =>
    Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.admin-form-actions .lcars-btn'),
    ).find(button => button.textContent?.trim() === 'Clear');

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

  /**
   * Renders the page with a member selected and their summary loaded.
   *
   * @param summary - The summary the API returns for that member.
   */
  const selectMember = (summary = buildSummary()): void => {
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(of(summary));
    fixture.detectChanges();
    component.selectMember(buildMember());
    fixture.detectChanges();
  };

  beforeEach(async () => {
    adminServiceSpy = {
      listPermissions: jest.fn(() => of(permissions)),
      getUserAccessSummary: jest.fn<Observable<UserAccessSummary>, [string]>(
        () => of(buildSummary()),
      ),
      setPermissionOverride: jest.fn<
        Observable<UserAccessSummary>,
        [string, SetPermissionOverrideRequest]
      >(() => of(buildSummary())),
      removePermissionOverride: jest.fn<
        Observable<UserAccessSummary>,
        [string, string]
      >(() => of(buildSummary())),
      setUserRole: jest.fn<
        Observable<UserAccessSummary>,
        [string, SetUserRoleRequest]
      >(() => of(buildSummary())),
    };

    moderationServiceSpy = {
      getUsers: jest.fn(() => of(buildPage([buildMember()]))),
    };

    accessControlServiceSpy = { refresh: jest.fn() };

    dialogSpy = { open: jest.fn() } as unknown as jest.Mocked<MatDialog>;

    // Privacy mode is read through the real service, so the page's blurring is
    // exercised the way the dashboard's is: from the saved user setting.
    dashboardServiceSpy = {
      getUserSettings: jest.fn(() =>
        of({ privacyMode: false } as UserSettings),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [PermissionAdminComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AccessControlAdminService, useValue: adminServiceSpy },
        { provide: AccessControlService, useValue: accessControlServiceSpy },
        { provide: ModerationService, useValue: moderationServiceSpy },
        { provide: DashboardService, useValue: dashboardServiceSpy },
      ],
    })
      .overrideComponent(PermissionAdminComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PermissionAdminComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the permission catalogue on init', () => {
    fixture.detectChanges();

    expect(adminServiceSpy.listPermissions).toHaveBeenCalled();
    expect(component.permissions).toEqual(permissions);
    expect(component.isLoadingPermissions).toBe(false);
  });

  it('reports a catalogue that fails to load', () => {
    adminServiceSpy.listPermissions.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Failed to load the list of permissions.',
    );
  });

  it('tolerates a malformed catalogue', () => {
    adminServiceSpy.listPermissions.mockReturnValueOnce(
      of(null as unknown as AdminPermission[]),
    );

    fixture.detectChanges();

    expect(component.permissions).toEqual([]);
  });

  it('gives up on a catalogue that never answers', () => {
    adminServiceSpy.listPermissions.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoadingPermissions).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoadingPermissions).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading the list of permissions is taking longer than expected. Please try again.',
    );
  });

  // ----- Finding a member -----

  it('searches for members with a trimmed term', () => {
    fixture.detectChanges();
    component.search = '  picard  ';

    component.searchMembers();

    expect(moderationServiceSpy.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'picard' }),
    );
    expect(component.members).toHaveLength(1);
    expect(component.memberTotal).toBe(1);
  });

  it('sends no search term when the box is empty', () => {
    fixture.detectChanges();
    component.search = '   ';

    component.searchMembers();

    expect(moderationServiceSpy.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined }),
    );
  });

  it('sets an error when the search fails', () => {
    fixture.detectChanges();
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.searchMembers();

    expect(component.isSearching).toBe(false);
    expect(component.errorMessage).toBe('Failed to search for members.');
  });

  it('handles a malformed page without hanging the search', () => {
    fixture.detectChanges();
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(null as unknown as PaginatedModeratedUsers),
    );

    component.searchMembers();

    expect(component.members).toEqual([]);
    expect(component.memberTotal).toBe(0);
    expect(component.isSearching).toBe(false);
  });

  it('clears the search when the request hangs', () => {
    fixture.detectChanges();
    moderationServiceSpy.getUsers.mockReturnValueOnce(NEVER);

    component.searchMembers();
    expect(component.isSearching).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isSearching).toBe(false);
    expect(component.errorMessage).toBe(
      'Searching for members is taking longer than expected. Please try again.',
    );
  });

  it('skips the timeout fallback once the search has already finished', () => {
    fixture.detectChanges();
    moderationServiceSpy.getUsers.mockReturnValueOnce(NEVER);
    component.searchMembers();
    component.isSearching = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('reports a search that matches nobody', () => {
    moderationServiceSpy.getUsers.mockReturnValueOnce(of(buildPage([])));
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No members match this search.',
    );
    // A search that matched nobody has finished, so nothing on the page is
    // still turning: the empty state replaces the loading bar rather than
    // sitting under it.
    expect(fixture.nativeElement.querySelector('app-loading-bar')).toBeNull();
  });

  it('asks for five members a page, starting at the first', () => {
    fixture.detectChanges();

    component.searchMembers();

    expect(moderationServiceSpy.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 5 }),
    );
  });

  it('hides the pager while the results fit on one page', () => {
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildMember()])),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lcars-pagination')).toBeNull();
  });

  it('pages through a search that matched more than one page', () => {
    moderationServiceSpy.getUsers.mockReturnValue(
      of(buildPage([buildMember()], 12)),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    const pager = fixture.nativeElement.querySelector('.lcars-pagination');
    expect(pager.textContent).toContain('Page 1 of 3');

    const [previous, next] = pager.querySelectorAll('button');
    expect(previous.disabled).toBe(true);

    next.click();
    fixture.detectChanges();

    expect(moderationServiceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 5 }),
    );
    expect(component.page).toBe(2);
    expect(
      fixture.nativeElement.querySelector('.lcars-pagination').textContent,
    ).toContain('Page 2 of 3');
  });

  it('starts a fresh search back at the first page', () => {
    moderationServiceSpy.getUsers.mockReturnValue(
      of(buildPage([buildMember()], 12)),
    );
    fixture.detectChanges();

    component.loadPage(3);
    component.searchMembers();

    expect(component.page).toBe(1);
    expect(moderationServiceSpy.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });

  it('offers no clear button until there is something to clear', () => {
    fixture.detectChanges();

    expect(clearButton()).toBeUndefined();

    component.search = 'picard';
    fixture.detectChanges();

    expect(clearButton()).toBeDefined();
  });

  it('empties the box and puts the results away when cleared', () => {
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildMember()], 12)),
    );
    fixture.detectChanges();
    component.search = 'picard';

    component.searchMembers();
    fixture.detectChanges();

    moderationServiceSpy.getUsers.mockClear();
    clearButton()!.click();
    fixture.detectChanges();

    expect(component.search).toBe('');
    expect(component.members).toEqual([]);
    expect(component.memberTotal).toBe(0);
    expect(component.page).toBe(1);
    // Clearing puts the panel back to how it starts, so neither the results nor
    // the "nobody matched" line is left behind.
    expect(fixture.nativeElement.querySelector('.member-card')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(
      'No members match this search.',
    );
    // And it costs nothing: an empty term would page the whole membership.
    expect(moderationServiceSpy.getUsers).not.toHaveBeenCalled();
  });

  it('leaves a result CTA usable while another request is in flight', () => {
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(NEVER);
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildMember()])),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    // A member's summary is loading, so the page is busy — but the CTA on the
    // results belongs to the search, and a disabled icon is all but invisible
    // on the card.
    component.isLoadingSummary = true;
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector('.member-card .cta-icon');
    expect(cta.disabled).toBe(false);
  });

  it('colours a member card and their role by the role they hold', () => {
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildMember({ role: 'ADMIN' })])),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.member-card');
    expect(card.classList).toContain('role-admin');
    const role = card.querySelector('.member-role');
    expect(role.classList).toContain('role-admin');
    expect(role.textContent.trim()).toBe('ADMIN');
  });

  it('lights the status lamp green for an active account and red for a disabled one', () => {
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(
        buildPage([
          buildMember(),
          buildMember({ id: 'member-2', isAccountDisabled: true }),
        ]),
      ),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    const statuses = fixture.nativeElement.querySelectorAll('.member-status');
    expect(statuses[0].textContent.trim()).toBe('Active');
    expect(statuses[0].querySelector('.status-light').classList).toContain(
      'on',
    );
    expect(statuses[1].textContent.trim()).toBe('Disabled');
    expect(statuses[1].querySelector('.status-light').classList).toContain(
      'off',
    );
  });

  it('shows each member email in the card body', () => {
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    const email = fixture.nativeElement.querySelector('.member-email');
    expect(email.textContent.trim()).toBe('member@example.com');
    expect(email.classList).not.toContain('privacy-blur');
  });

  it('blurs member email addresses when privacy mode is enabled', () => {
    dashboardServiceSpy.getUserSettings.mockReturnValueOnce(
      of({ privacyMode: true } as UserSettings),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.member-email').classList,
    ).toContain('privacy-blur');
  });

  it('leaves the username legible, and blurs the search box', () => {
    dashboardServiceSpy.getUserSettings.mockReturnValueOnce(
      of({ privacyMode: true } as UserSettings),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.admin-record-title strong')
        .classList,
    ).not.toContain('privacy-blur');
    expect(
      fixture.nativeElement.querySelector('#permission-search-input').classList,
    ).toContain('privacy-blur');
  });

  it('blurs the heading of a member who is named by their address', () => {
    dashboardServiceSpy.getUserSettings.mockReturnValueOnce(
      of({ privacyMode: true } as UserSettings),
    );
    moderationServiceSpy.getUsers.mockReturnValueOnce(
      of(buildPage([buildMember({ username: null })])),
    );
    fixture.detectChanges();

    component.searchMembers();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.admin-record-title strong')
        .classList,
    ).toContain('privacy-blur');
  });

  it('keeps addresses hidden when the privacy setting cannot be read', () => {
    dashboardServiceSpy.getUserSettings.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    fixture.detectChanges();

    expect(component.privacyMode.isEnabled()).toBe(true);
    expect(component.errorMessage).toBe('');
  });

  // ----- Reading a member's permissions -----

  it("loads a member's summary when they are selected", () => {
    selectMember();

    expect(adminServiceSpy.getUserAccessSummary).toHaveBeenCalledWith(
      MEMBER_ID,
    );
    expect(component.selectedMember?.id).toBe(MEMBER_ID);
    expect(component.isLoadingSummary).toBe(false);
  });

  it('says where each permission comes from', () => {
    selectMember(
      buildSummary({
        effectivePermissions: [VIEW, MODERATE],
        overrides: [
          buildOverride(),
          buildOverride({
            id: 'override-2',
            permissionCode: SPOTLIGHT,
            effect: PermissionEffect.DENY,
            reason: 'Spotlight abuse.',
          }),
        ],
      }),
    );

    expect(component.rows.map(row => row.status)).toEqual([
      'ROLE',
      'GRANTED',
      'DENIED',
    ]);
    expect(component.rows[1].override?.reason).toBe('Volunteer moderator.');
    expect(component.rows[2].isHeld).toBe(false);
  });

  it('renders each permission with its standing', () => {
    selectMember(
      buildSummary({
        effectivePermissions: [VIEW, MODERATE],
        overrides: [buildOverride()],
      }),
    );

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Moderate Storytime');
    expect(text).toContain(MODERATE);
    expect(text).toContain('Held via role');
    expect(text).toContain('Granted by override');
    expect(text).toContain('Not held');
    expect(text).toContain('Volunteer moderator.');
    expect(text).toContain('Never');
  });

  it("sets an error when a member's summary fails to load", () => {
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    fixture.detectChanges();

    component.selectMember(buildMember());

    expect(component.summary).toBeNull();
    expect(component.rows).toEqual([]);
    expect(component.errorMessage).toBe(
      "Failed to load that member's permissions.",
    );
  });

  it('gives up on a summary that never answers', () => {
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(NEVER);
    fixture.detectChanges();

    component.selectMember(buildMember());
    expect(component.isLoadingSummary).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoadingSummary).toBe(false);
    expect(component.summary).toBeNull();
    expect(component.rows).toEqual([]);
    expect(component.errorMessage).toBe(
      "Loading that member's permissions is taking longer than expected. Please try again.",
    );
  });

  it('returns to the search without changing anything', () => {
    selectMember();

    component.clearSelection();

    expect(component.selectedMember).toBeNull();
    expect(component.summary).toBeNull();
    expect(component.rows).toEqual([]);
  });

  // ----- Setting a role -----

  it('points the role picker at the role the server reports', () => {
    selectMember(buildSummary({ role: ASSIGNABLE_ROLES.STORYTIME_CURATOR }));

    expect(component.chosenRole).toBe(ASSIGNABLE_ROLES.STORYTIME_CURATOR);
    expect(component.currentRole).toBe(ASSIGNABLE_ROLES.STORYTIME_CURATOR);
    expect(component.selectedMember?.role).toBe(
      ASSIGNABLE_ROLES.STORYTIME_CURATOR,
    );
    expect(component.isRoleChanged).toBe(false);
  });

  it('reads the role off the member until the server answers', () => {
    expect(component.currentRole).toBe('');

    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    fixture.detectChanges();
    component.selectMember(buildMember({ role: ASSIGNABLE_ROLES.USER }));

    expect(component.summary).toBeNull();
    expect(component.currentRole).toBe(ASSIGNABLE_ROLES.USER);
  });

  it('leaves a member alone when their summary lands after they are put away', () => {
    const summaries = new Subject<UserAccessSummary>();
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(
      summaries.asObservable(),
    );
    fixture.detectChanges();
    const member = buildMember();
    component.selectMember(member);
    component.clearSelection();

    summaries.next(buildSummary({ role: ASSIGNABLE_ROLES.STORYTIME_CURATOR }));

    expect(member.role).toBe(ASSIGNABLE_ROLES.USER);
  });

  it('keeps the role on the card when the summary carries none', () => {
    selectMember(buildSummary({ role: '' }));

    expect(component.selectedMember?.role).toBe(ASSIGNABLE_ROLES.USER);
    expect(component.chosenRole).toBe(ASSIGNABLE_ROLES.USER);
  });

  it("reads an administrator's role without offering to change it", () => {
    adminServiceSpy.getUserAccessSummary.mockReturnValueOnce(
      of(buildSummary({ role: ADMIN_ROLE })),
    );
    fixture.detectChanges();
    component.selectMember(buildMember({ role: ADMIN_ROLE }));
    fixture.detectChanges();

    expect(component.isAdminMember).toBe(true);
    expect(
      fixture.nativeElement.querySelector('#member-role-select'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.role-locked')).toBeTruthy();

    component.chosenRole = ASSIGNABLE_ROLES.STORYTIME_CURATOR;
    component.changeRole();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(adminServiceSpy.setUserRole).not.toHaveBeenCalled();
  });

  it('makes a member a curator after confirmation', () => {
    selectMember();
    stubDialog(true);
    const updated = buildSummary({
      role: ASSIGNABLE_ROLES.STORYTIME_CURATOR,
      effectivePermissions: [VIEW, MODERATE, SPOTLIGHT],
    });
    adminServiceSpy.setUserRole.mockReturnValueOnce(of(updated));

    component.chosenRole = ASSIGNABLE_ROLES.STORYTIME_CURATOR;
    component.changeRole();

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(adminServiceSpy.setUserRole).toHaveBeenCalledWith(MEMBER_ID, {
      role: ASSIGNABLE_ROLES.STORYTIME_CURATOR,
    });
    expect(component.summary).toEqual(updated);
    expect(component.selectedMember?.role).toBe(
      ASSIGNABLE_ROLES.STORYTIME_CURATOR,
    );
    expect(component.rows[1].status).toBe('ROLE');
    expect(component.successMessage).toBe('member is now a storytime curator.');
  });

  it('does not change the role when the administrator cancels', () => {
    selectMember();
    stubDialog(false);

    component.chosenRole = ASSIGNABLE_ROLES.STORYTIME_CURATOR;
    component.changeRole();

    expect(adminServiceSpy.setUserRole).not.toHaveBeenCalled();
  });

  it('does nothing when the picker shows the role already in force', () => {
    selectMember();

    component.changeRole();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(adminServiceSpy.setUserRole).not.toHaveBeenCalled();
  });

  it('does nothing with nobody selected', () => {
    fixture.detectChanges();

    component.changeRole();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(adminServiceSpy.setUserRole).not.toHaveBeenCalled();
  });

  it('reports a role change the API refuses', () => {
    selectMember();
    stubDialog(true);
    adminServiceSpy.setUserRole.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }),
      ),
    );

    component.chosenRole = ASSIGNABLE_ROLES.STORYTIME_CURATOR;
    component.changeRole();

    expect(component.errorMessage).toBe(
      'The API refused that role change. Administrator roles are set outside STO Info.',
    );
  });

  it('reports a role change that fails', () => {
    selectMember();
    stubDialog(true);
    adminServiceSpy.setUserRole.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    component.chosenRole = ASSIGNABLE_ROLES.STORYTIME_CURATOR;
    component.changeRole();

    expect(component.errorMessage).toBe('Failed to change that role.');
  });

  // ----- Applying an override -----

  it('fills the form in from a permission row', () => {
    selectMember(buildSummary({ overrides: [buildOverride()] }));

    component.prepareOverride(component.rows[1], PermissionEffect.DENY);

    expect(component.form.getRawValue()).toEqual({
      permissionCode: MODERATE,
      effect: PermissionEffect.DENY,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });
  });

  it('leaves the reason empty for a permission nothing overrides', () => {
    selectMember();

    component.prepareOverride(component.rows[1], PermissionEffect.GRANT);

    expect(component.form.getRawValue().reason).toBe('');
  });

  it('names a permission the catalogue no longer lists by its code', () => {
    selectMember();
    component.form.setValue({
      permissionCode: 'storytime.retired',
      effect: PermissionEffect.GRANT,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });

    component.applyOverride();

    expect(component.successMessage).toBe(
      'storytime.retired was granted for member.',
    );
  });

  it('applies an indefinite override and adopts the returned summary', () => {
    selectMember();
    const updated = buildSummary({
      effectivePermissions: [VIEW, MODERATE],
      overrides: [buildOverride()],
    });
    adminServiceSpy.setPermissionOverride.mockReturnValueOnce(of(updated));

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: '  Volunteer moderator.  ',
      expiresAt: '',
    });
    component.applyOverride();

    expect(adminServiceSpy.setPermissionOverride).toHaveBeenCalledWith(
      MEMBER_ID,
      {
        permissionCode: MODERATE,
        effect: PermissionEffect.GRANT,
        reason: 'Volunteer moderator.',
        expiresAt: undefined,
      },
    );
    expect(component.summary).toEqual(updated);
    expect(component.rows[1].status).toBe('GRANTED');
    expect(component.successMessage).toBe(
      'Moderate Storytime was granted for member.',
    );
    expect(component.form.getRawValue().reason).toBe('');
  });

  it('says a permission was withheld when denying it', () => {
    selectMember();

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.DENY,
      reason: 'Abuse of the queue.',
      expiresAt: '',
    });
    component.applyOverride();

    expect(component.successMessage).toBe(
      'Moderate Storytime was withheld for member.',
    );
  });

  it('sends a future expiry as an ISO timestamp', () => {
    selectMember();

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Trial run.',
      expiresAt: '2026-12-01T09:30',
    });
    component.applyOverride();

    expect(adminServiceSpy.setPermissionOverride).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({
        expiresAt: new Date('2026-12-01T09:30').toISOString(),
      }),
    );
  });

  it('refuses an expiry that has already passed', () => {
    selectMember();

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Trial run.',
      expiresAt: '2020-01-01T09:30',
    });
    component.applyOverride();

    expect(adminServiceSpy.setPermissionOverride).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe(
      'The expiry must be a date and time in the future.',
    );
  });

  it('will not apply an override with no permission or reason', () => {
    selectMember();

    component.applyOverride();

    expect(adminServiceSpy.setPermissionOverride).not.toHaveBeenCalled();
    expect(component.form.controls.reason.touched).toBe(true);
  });

  it('will not apply an override with nobody selected', () => {
    fixture.detectChanges();

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });
    component.applyOverride();

    expect(adminServiceSpy.setPermissionOverride).not.toHaveBeenCalled();
  });

  it('explains an override the API rejects', () => {
    selectMember();
    adminServiceSpy.setPermissionOverride.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }),
      ),
    );

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });
    component.applyOverride();

    expect(component.errorMessage).toBe(
      'The API rejected that override. Check the reason and the expiry.',
    );
  });

  it('falls back to the generic failure for any other error', () => {
    selectMember();
    adminServiceSpy.setPermissionOverride.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });
    component.applyOverride();

    expect(component.errorMessage).toBe('Failed to apply that override.');
    expect(component.isSaving).toBe(false);
  });

  it("drops the signed-in user's cached permissions after a change", () => {
    selectMember();

    component.form.setValue({
      permissionCode: MODERATE,
      effect: PermissionEffect.GRANT,
      reason: 'Volunteer moderator.',
      expiresAt: '',
    });
    component.applyOverride();

    expect(accessControlServiceSpy.refresh).toHaveBeenCalled();
  });

  // ----- Withdrawing an override -----

  it('withdraws an override after confirmation', () => {
    selectMember(buildSummary({ overrides: [buildOverride()] }));
    stubDialog(true);

    component.withdrawOverride(component.rows[1]);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(adminServiceSpy.removePermissionOverride).toHaveBeenCalledWith(
      MEMBER_ID,
      MODERATE,
    );
    expect(component.successMessage).toBe(
      'The override on Moderate Storytime was withdrawn from member.',
    );
  });

  it('does not withdraw when the administrator cancels', () => {
    selectMember(buildSummary({ overrides: [buildOverride()] }));
    stubDialog(false);

    component.withdrawOverride(component.rows[1]);

    expect(adminServiceSpy.removePermissionOverride).not.toHaveBeenCalled();
  });

  it('does nothing when there is no override to withdraw', () => {
    selectMember();

    component.withdrawOverride(component.rows[1]);

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(adminServiceSpy.removePermissionOverride).not.toHaveBeenCalled();
  });

  it('reports a withdrawal that fails', () => {
    selectMember(buildSummary({ overrides: [buildOverride()] }));
    stubDialog(true);
    adminServiceSpy.removePermissionOverride.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );

    component.withdrawOverride(component.rows[1]);

    expect(component.errorMessage).toBe('Failed to withdraw that override.');
  });
});
