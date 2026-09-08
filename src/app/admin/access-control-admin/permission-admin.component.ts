import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Observable, finalize, take } from 'rxjs';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import {
  ADMIN_ROLE,
  ASSIGNABLE_ROLES,
  ASSIGNABLE_ROLE_DESCRIPTIONS,
  ASSIGNABLE_ROLE_LABELS,
  AdminPermission,
  AssignableRole,
  PERMISSION_EFFECT_LABELS,
  PermissionEffect,
  UserAccessSummary,
  UserPermissionOverride,
} from 'src/app/models/access-control.models';
import { ModeratedUser } from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DATE_TIME_WITH_ZONE_FORMAT } from 'src/app/shared/constants/date-formats.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlAdminService } from 'src/app/shared/services/access-control-admin.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import {
  isMemberNamedByEmail,
  memberDisplayName,
  memberRoleLabel,
  memberRoleModifier,
} from 'src/app/shared/utils/member-role.utils';

const PAGE_SIZE = 5;
const LOAD_TIMEOUT_MS = 12000;
const REASON_MAX_LENGTH = 500;

/** Where a member's standing on one permission comes from. */
export type PermissionStatus = 'ROLE' | 'GRANTED' | 'DENIED' | 'NONE';

/** One permission as this page shows it for the selected member. */
export interface PermissionRow {
  permission: AdminPermission;
  /** The override in force for this permission, if any. */
  override: UserPermissionOverride | null;
  /** Whether the member currently holds the permission. */
  isHeld: boolean;
  status: PermissionStatus;
}

const STATUS_LABELS: Record<PermissionStatus, string> = {
  ROLE: 'Held via role',
  GRANTED: 'Granted by override',
  DENIED: 'Denied by override',
  NONE: 'Not held',
};

/**
 * The `status-pill` modifier each standing is rendered with.
 *
 * These are this page's own modifiers rather than the shared `success`/`info`/
 * `warning` ones, because the shared set renders "held" and "granted" in the
 * same colour — and telling a permission the role confers apart from one an
 * administrator granted by hand is the whole point of the list.
 */
const STATUS_PILL_CLASSES: Record<PermissionStatus, string> = {
  ROLE: 'permission-role',
  GRANTED: 'permission-granted',
  DENIED: 'permission-denied',
  NONE: 'permission-none',
};

/**
 * What one member may do: find them, set the role their permissions start
 * from, then grant or withhold individual permissions on top of it.
 *
 * The two controls answer different questions. The role is the whole job — a
 * curator runs Storytime: the moderation queue, the Spotlight and the tag
 * vocabulary — while an override is one capability adjusted for one person,
 * recorded with the reason it was given. Without either, the only way to
 * change what somebody may do would be to write a row into the database by
 * hand.
 *
 * The administrator role is not among the ones offered, and an administrator's
 * own role cannot be changed here. Administrators are appointed outside the
 * application, and a screen that could mint or unmake them would let one
 * mistaken click take the site away from everybody who runs it.
 *
 * The page is reachable by administrators only, and the server independently
 * refuses every request here without the ADMIN role.
 */
@Component({
  selector: 'app-permission-admin',
  templateUrl: './permission-admin.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './permission-admin.component.scss',
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class PermissionAdminComponent implements OnInit {
  private readonly _fb = inject(FormBuilder);
  private readonly _adminService = inject(AccessControlAdminService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _moderationService = inject(ModerationService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  /**
   * Whether email addresses are blurred on screen. Read by the template, so it
   * is public.
   */
  readonly privacyMode = inject(PrivacyModeService);

  appRoutes = APP_ROUTES;
  dateTimeFormat = DATE_TIME_WITH_ZONE_FORMAT;
  permissionEffect = PermissionEffect;
  effects = Object.values(PermissionEffect);
  effectLabels = PERMISSION_EFFECT_LABELS;
  statusLabels = STATUS_LABELS;
  statusPillClasses = STATUS_PILL_CLASSES;
  reasonMaxLength = REASON_MAX_LENGTH;
  assignableRoles: AssignableRole[] = Object.values(ASSIGNABLE_ROLES);
  roleLabels = ASSIGNABLE_ROLE_LABELS;
  roleDescriptions = ASSIGNABLE_ROLE_DESCRIPTIONS;

  /** The role chosen in the picker, which may not be the one in force yet. */
  chosenRole: AssignableRole = ASSIGNABLE_ROLES.USER;

  /** Every permission the server recognises, ordered by module then code. */
  permissions: AdminPermission[] = [];

  search = '';
  members: ModeratedUser[] = [];
  memberTotal = 0;
  /** The 1-based page of member results on screen. */
  page = 1;
  hasSearched = false;

  selectedMember: ModeratedUser | null = null;
  summary: UserAccessSummary | null = null;
  rows: PermissionRow[] = [];

  isLoadingPermissions = false;
  isSearching = false;
  isLoadingSummary = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form = this._fb.group({
    permissionCode: ['', [Validators.required]],
    effect: [PermissionEffect.GRANT, [Validators.required]],
    reason: [
      '',
      [Validators.required, Validators.maxLength(REASON_MAX_LENGTH)],
    ],
    expiresAt: [''],
  });

  /**
   * Loads the permission catalogue on init, so the override form can offer
   * whatever the server currently recognises rather than a hard-coded list, and
   * the viewer's privacy-mode setting, which decides whether the member email
   * addresses on this page are blurred.
   */
  ngOnInit(): void {
    this.loadPermissions();
    this.loadPrivacyMode();
  }

  /**
   * Whether anything on the page is waiting on the API.
   *
   * @returns True while a request is in flight.
   */
  get isBusy(): boolean {
    return (
      this.isLoadingPermissions ||
      this.isSearching ||
      this.isLoadingSummary ||
      this.isSaving
    );
  }

  /**
   * How many pages of member results the last search found.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.memberTotal / PAGE_SIZE));
  }

  /**
   * The role the selected member holds, preferring the server's answer to the
   * one the search result was rendered from.
   *
   * @returns The role, or an empty string when no member is selected.
   */
  get currentRole(): string {
    return this.summary?.role ?? this.selectedMember?.role ?? '';
  }

  /**
   * Whether the selected member is an administrator, whose role this screen
   * reads but never sets.
   *
   * @returns True when the member holds the administrator role.
   */
  get isAdminMember(): boolean {
    return this.currentRole === ADMIN_ROLE;
  }

  /**
   * Whether the picker is offering a role the member does not already hold.
   *
   * @returns True when applying the picker would change something.
   */
  get isRoleChanged(): boolean {
    return this.chosenRole !== this.currentRole;
  }

  // The member card is formatted the same way on the Manage Members list, so
  // how a member is named, coloured and labelled lives in one shared place.

  /** How a member is named on screen. */
  displayName = memberDisplayName;

  /**
   * Whether a member's name on screen is really their email address, which
   * privacy mode blurs even though an STO Info username is not private.
   */
  isNameAnEmail = isMemberNamedByEmail;

  /** The class modifier for a member's role, used to colour their card. */
  roleModifier = memberRoleModifier;

  /** How a member's role reads on screen. */
  roleLabel = memberRoleLabel;

  // ----- Finding a member -----

  /**
   * Searches for the member whose permissions are being changed, starting again
   * at the first page of results.
   */
  searchMembers(): void {
    this.loadPage(1);
  }

  /**
   * Loads one page of the member search.
   *
   * @param page - The 1-based page number to load.
   */
  loadPage(page: number): void {
    this.page = page;
    this.isSearching = true;
    this.hasSearched = true;
    this.errorMessage = '';
    this.successMessage = '';

    const loadingTimeout = this.withLoadTimeout(
      () => this.isSearching,
      () => {
        this.isSearching = false;
        this.members = [];
        this.errorMessage =
          'Searching for members is taking longer than expected. Please try again.';
      },
    );

    this._moderationService
      .getUsers({
        search: this.search.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.members = Array.isArray(result?.items) ? result.items : [];
          this.memberTotal = result?.total ?? 0;
          this.isSearching = false;
        },
        error: () => {
          this.errorMessage = 'Failed to search for members.';
          this.isSearching = false;
        },
      });
  }

  /**
   * Empties the search box and puts the results away, returning the panel to
   * the state it starts in.
   *
   * Nothing is asked of the API. An empty term here would page through the
   * whole membership, which is the Manage Members list's job — this page only
   * ever wants the one account being worked on.
   */
  clearSearch(): void {
    this.search = '';
    this.members = [];
    this.memberTotal = 0;
    this.page = 1;
    this.hasSearched = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Selects a member and loads what they may currently do.
   *
   * @param member - The member to work on.
   */
  selectMember(member: ModeratedUser): void {
    this.selectedMember = member;
    this.summary = null;
    this.rows = [];
    this.pointRolePickerAt(member.role);
    this.errorMessage = '';
    this.successMessage = '';
    this.form.reset({
      permissionCode: '',
      effect: PermissionEffect.GRANT,
      reason: '',
      expiresAt: '',
    });

    this.loadSummary(member.id);
  }

  /**
   * Returns to the member search without changing anything.
   */
  clearSelection(): void {
    this.selectedMember = null;
    this.summary = null;
    this.rows = [];
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ----- Role -----

  /**
   * Gives the selected member the role in the picker, after confirmation.
   *
   * Confirmed rather than applied outright because a role is the blunt
   * instrument: promoting somebody hands them the moderation queue, the
   * Spotlight and the tag vocabulary in one go, and demoting them takes all
   * three away.
   */
  changeRole(): void {
    const member = this.selectedMember;
    if (!member || this.isAdminMember || !this.isRoleChanged) {
      return;
    }

    const role = this.chosenRole;
    const name = this.displayName(member);
    const label = this.roleLabels[role];

    this.confirm(
      {
        title: 'Change Role',
        message: `
          <p>Make <strong>${name}</strong> a
          <strong>${label}</strong>?</p>
          <p>${this.roleDescriptions[role]}</p>
          <p>Overrides already applied to them stay in force, and still beat
          whatever the new role confers.</p>`,
        confirmText: 'Change role',
      },
      () =>
        this.runChange(
          () => this._adminService.setUserRole(member.id, { role }),
          `${name} is now a ${label.toLowerCase()}.`,
          'Failed to change that role.',
          'The API refused that role change. Administrator roles are set outside STO Info.',
        ),
    );
  }

  // ----- Overrides -----

  /**
   * Fills the override form in from a permission row, so the administrator
   * confirms the reason rather than re-picking the permission from a list of
   * codes they have just been reading.
   *
   * @param row - The permission being overridden.
   * @param effect - Whether to grant it or withhold it.
   */
  prepareOverride(row: PermissionRow, effect: PermissionEffect): void {
    this.successMessage = '';
    this.form.patchValue({
      permissionCode: row.permission.code,
      effect,
      reason: row.override?.reason ?? '',
      expiresAt: '',
    });
    this.form.markAsUntouched();
  }

  /**
   * Applies the override described by the form.
   */
  applyOverride(): void {
    const member = this.selectedMember;
    if (!member) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const expiresAt = this.toIsoExpiry(value.expiresAt);

    if (expiresAt === null) {
      this.errorMessage = 'The expiry must be a date and time in the future.';
      return;
    }

    // `permissionCode` and `effect` are required and validated above, so
    // neither is null here.
    const permissionCode = value.permissionCode!;
    const effect = value.effect!;
    const verb = effect === PermissionEffect.GRANT ? 'granted' : 'withheld';

    this.runChange(
      () =>
        this._adminService.setPermissionOverride(member.id, {
          permissionCode,
          effect,
          reason: value.reason!.trim(),
          expiresAt,
        }),
      `${this.permissionName(permissionCode)} was ${verb} for ${this.displayName(member)}.`,
      'Failed to apply that override.',
      'The API rejected that override. Check the reason and the expiry.',
      () =>
        this.form.reset({
          permissionCode: '',
          effect: PermissionEffect.GRANT,
          reason: '',
          expiresAt: '',
        }),
    );
  }

  /**
   * Withdraws an override, after confirmation.
   *
   * @param row - The permission whose override is being withdrawn.
   */
  withdrawOverride(row: PermissionRow): void {
    const member = this.selectedMember;
    if (!member || !row.override) {
      return;
    }

    const name = this.displayName(member);
    const permissionName = row.permission.name;

    this.confirm(
      {
        title: 'Withdraw Override',
        message: `
          <p>Withdraw the
          <strong>${this.effectLabels[row.override.effect].toLowerCase()}</strong>
          override on <strong>${permissionName}</strong> for
          <strong>${name}</strong>?</p>
          <p>They go back to whatever their role confers, which may take the
          permission away or hand it back.</p>`,
        confirmText: 'Withdraw',
      },
      () =>
        this.runChange(
          () =>
            this._adminService.removePermissionOverride(
              member.id,
              row.permission.code,
            ),
          `The override on ${permissionName} was withdrawn from ${name}.`,
          'Failed to withdraw that override.',
          'The API rejected that withdrawal.',
        ),
    );
  }

  // ----- Helpers -----

  /**
   * Adopts the role the server reports, so the member card and the picker both
   * show what is in force rather than the value the search result was rendered
   * from — which is stale the moment the role is changed.
   *
   * A summary without a role leaves both alone: the card would otherwise lose
   * the role it already has in exchange for nothing.
   *
   * @param summary - The summary just received.
   */
  private adoptReportedRole(summary: UserAccessSummary): void {
    if (!summary.role) {
      return;
    }

    if (this.selectedMember) {
      this.selectedMember.role = summary.role;
    }

    this.pointRolePickerAt(summary.role);
  }

  /**
   * Points the role picker at a member's current role.
   *
   * A role the picker cannot offer — an administrator's, or one the API gains
   * later — falls back to Member, so the control never displays a value it
   * would refuse to submit. Administrators are read-only here anyway.
   *
   * @param role - The role the member holds.
   */
  private pointRolePickerAt(role: string): void {
    this.chosenRole = this.assignableRoles.includes(role as AssignableRole)
      ? (role as AssignableRole)
      : ASSIGNABLE_ROLES.USER;
  }

  /**
   * Gives a load a deadline, so a request that never answers cannot leave the
   * page turning for ever.
   *
   * The loading bar is driven by {@link isBusy}, which is true while *any* of
   * the four loads is in flight, and each of them clears its own flag only when
   * the API answers. One request that neither returns nor fails therefore keeps
   * the bar on screen through everything else the administrator does — a search
   * that comes back with no members looks like it is still running, because the
   * bar above it belongs to a different request. Past the deadline the stuck
   * flag is cleared and the reason is put on screen.
   *
   * @param isStillLoading - Whether the load being guarded is still in flight.
   * @param onTimeout - Clears that load's state and sets the error copy.
   * @returns The timer handle, cleared once the request answers.
   */
  private withLoadTimeout(
    isStillLoading: () => boolean,
    onTimeout: () => void,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (!isStillLoading()) {
        return;
      }

      this._ngZone.run(() => {
        onTimeout();
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);
  }

  /**
   * Loads the permission catalogue.
   */
  private loadPermissions(): void {
    this.isLoadingPermissions = true;

    const loadingTimeout = this.withLoadTimeout(
      () => this.isLoadingPermissions,
      () => {
        this.isLoadingPermissions = false;
        this.errorMessage =
          'Loading the list of permissions is taking longer than expected. Please try again.';
      },
    );

    this._adminService
      .listPermissions()
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          clearTimeout(loadingTimeout);
          this.isLoadingPermissions = false;
        }),
      )
      .subscribe({
        next: permissions => {
          this.permissions = Array.isArray(permissions) ? permissions : [];
          this.buildRows();
        },
        error: () =>
          (this.errorMessage = 'Failed to load the list of permissions.'),
      });
  }

  /**
   * Loads the viewer's privacy-mode setting, which decides whether the member
   * email addresses on this page are blurred.
   *
   * A failure is deliberately silent: the service starts out enabled, so an
   * unreadable setting leaves the addresses hidden rather than exposing them,
   * and this page's error banner stays free for failures that stop the
   * administrator getting their work done.
   */
  private loadPrivacyMode(): void {
    this.privacyMode
      .load()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({ error: () => undefined });
  }

  /**
   * Loads a member's effective permissions and active overrides.
   *
   * @param userId - The member to describe.
   */
  private loadSummary(userId: string): void {
    this.isLoadingSummary = true;

    const loadingTimeout = this.withLoadTimeout(
      () => this.isLoadingSummary,
      () => {
        this.isLoadingSummary = false;
        this.summary = null;
        this.rows = [];
        this.errorMessage =
          "Loading that member's permissions is taking longer than expected. Please try again.";
      },
    );

    this._adminService
      .getUserAccessSummary(userId)
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          clearTimeout(loadingTimeout);
          this.isLoadingSummary = false;
        }),
      )
      .subscribe({
        next: summary => {
          this.summary = summary;
          this.adoptReportedRole(summary);
          this.buildRows();
        },
        error: () => {
          this.summary = null;
          this.rows = [];
          this.errorMessage = "Failed to load that member's permissions.";
        },
      });
  }

  /**
   * Applies a change and adopts the summary the server sends back, so the page
   * shows what is actually in force rather than an optimistic guess.
   *
   * @param action - Builds the request to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   * @param rejectedMessage - Copy shown when the API refuses the change
   *   outright, which says what was wrong with it rather than that it failed.
   * @param onSuccess - Optional extra work once the change lands.
   */
  private runChange(
    action: () => Observable<UserAccessSummary>,
    successMessage: string,
    failureMessage: string,
    rejectedMessage: string,
    onSuccess?: () => void,
  ): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    action()
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => (this.isSaving = false)),
      )
      .subscribe({
        next: summary => {
          this.summary = summary;
          this.adoptReportedRole(summary);
          this.buildRows();
          this.successMessage = successMessage;
          // The administrator may have just changed their own access, and the
          // signed-in user's permissions are cached for the session.
          this._accessControlService.refresh();
          onSuccess?.();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof HttpErrorResponse &&
            error.status === HttpStatusCode.BadRequest
              ? rejectedMessage
              : failureMessage;
        },
      });
  }

  /**
   * Rebuilds the permission rows from the catalogue and the loaded summary.
   */
  private buildRows(): void {
    const summary = this.summary;

    if (!summary) {
      this.rows = [];
      return;
    }

    const held = new Set(summary.effectivePermissions);
    const overridesByCode = new Map(
      summary.overrides.map(override => [override.permissionCode, override]),
    );

    this.rows = this.permissions.map(permission => {
      const override = overridesByCode.get(permission.code) ?? null;
      const isHeld = held.has(permission.code);

      return {
        permission,
        override,
        isHeld,
        status: this.statusFor(override, isHeld),
      };
    });
  }

  /**
   * Works out where a member's standing on one permission comes from.
   *
   * @param override - The override in force, if any.
   * @param isHeld - Whether the permission is currently held.
   * @returns The standing to show.
   */
  private statusFor(
    override: UserPermissionOverride | null,
    isHeld: boolean,
  ): PermissionStatus {
    if (override) {
      return override.effect === PermissionEffect.GRANT ? 'GRANTED' : 'DENIED';
    }

    return isHeld ? 'ROLE' : 'NONE';
  }

  /**
   * Names a permission for a message, falling back to the raw code for one the
   * catalogue does not describe.
   *
   * @param code - The permission code.
   * @returns The permission's name.
   */
  private permissionName(code: string): string {
    return this.permissions.find(p => p.code === code)?.name ?? code;
  }

  /**
   * Converts the form's local expiry into the ISO timestamp the API expects.
   *
   * @param value - The `datetime-local` value, if the field was filled in.
   * @returns The ISO timestamp, undefined for an indefinite override, or null
   *   when the value is unparseable or already in the past.
   */
  private toIsoExpiry(
    value: string | null | undefined,
  ): string | null | undefined {
    if (!value) {
      return undefined;
    }

    const expiry = new Date(value);

    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      return null;
    }

    return expiry.toISOString();
  }

  /**
   * Opens the LCARS confirmation dialog and runs the action if confirmed.
   *
   * @param data - The dialog copy.
   * @param onConfirm - Invoked when the administrator confirms.
   */
  private confirm(
    data: { title: string; message: string; confirmText: string },
    onConfirm: () => void,
  ): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: { ...data, cancelText: 'Cancel' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }
}
