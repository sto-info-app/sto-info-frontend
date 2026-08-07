import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Observable, finalize, take } from 'rxjs';
import { ModeratedUser } from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

const PAGE_SIZE = 20;
const LOAD_TIMEOUT_MS = 12000;

/** The account-state filter options. */
type DisabledFilter = 'ALL' | 'ACTIVE' | 'DISABLED';

const DISABLED_FILTER_LABELS: Record<DisabledFilter, string> = {
  ALL: 'All members',
  ACTIVE: 'Active only',
  DISABLED: 'Disabled only',
};

/**
 * The member directory an administrator works from: search for an account, see
 * whether it is locked and how many reports name it, and disable or restore it.
 *
 * Disabling here does the same thing as disabling from the report queue — the
 * server ends the member's sessions and closes every open report about them —
 * but this page reaches accounts nobody has reported, which is what a support
 * request or a spam wave usually needs.
 */
@Component({
  selector: 'app-user-admin-list',
  templateUrl: './user-admin-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './moderation-admin.component.scss',
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class UserAdminListComponent implements OnInit {
  private readonly _moderationService = inject(ModerationService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  appRoutes = APP_ROUTES;
  disabledFilters: DisabledFilter[] = ['ALL', 'ACTIVE', 'DISABLED'];
  disabledFilterLabels = DISABLED_FILTER_LABELS;

  users: ModeratedUser[] = [];
  total = 0;
  disabledFilter: DisabledFilter = 'ALL';
  search = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  /**
   * Loads the first page of members on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads members for the current filter.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.users = [];
        this.errorMessage =
          'Loading members is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this._moderationService
      .getUsers({
        search: this.search.trim() || undefined,
        disabled: this.disabledFilterValue,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.users = Array.isArray(result?.items) ? result.items : [];
          this.total = result?.total ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load members.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Reloads after the filter or search term changes.
   */
  applyFilters(): void {
    this.successMessage = '';
    this.load();
  }

  /**
   * Disables a member's account.
   *
   * @param user - The member to disable.
   */
  disable(user: ModeratedUser): void {
    const name = this.displayName(user);

    this.confirm(
      {
        title: 'Disable Account',
        message: `
          <p>Disable <strong>${name}</strong>?</p>
          <p>They are signed out immediately and cannot sign in again, their
          record leaves the registry, and every open report about them is
          closed as actioned.</p>
          <p><strong>WARNING:</strong> They are not told why.</p>`,
        confirmText: 'Disable',
      },
      () =>
        this.runAction(
          () => this._moderationService.disableUser(user.id),
          `${name}'s account was disabled.`,
          'Failed to disable that account.',
        ),
    );
  }

  /**
   * Restores a disabled member's account.
   *
   * @param user - The member to restore.
   */
  enable(user: ModeratedUser): void {
    const name = this.displayName(user);

    this.confirm(
      {
        title: 'Restore Account',
        message: `
          <p>Restore <strong>${name}</strong>?</p>
          <p>They can sign in again and their record returns to the registry.
          Reports already closed against them stay closed.</p>`,
        confirmText: 'Restore',
      },
      () =>
        this.runAction(
          () => this._moderationService.enableUser(user.id),
          `${name}'s account was restored.`,
          'Failed to restore that account.',
        ),
    );
  }

  /**
   * How a member is named on screen: their username, falling back to the email
   * address every account has.
   *
   * @param user - The member.
   * @returns The display name.
   */
  displayName(user: ModeratedUser): string {
    return user.username ?? user.email;
  }

  // ----- Helpers -----

  /**
   * The `disabled` query value for the current filter.
   *
   * `false` is meaningful here — "active only" — so the "all" case is the
   * only one that leaves the parameter off.
   *
   * @returns The filter value, or undefined for no filter.
   */
  private get disabledFilterValue(): boolean | undefined {
    switch (this.disabledFilter) {
      case 'ACTIVE':
        return false;
      case 'DISABLED':
        return true;
      default:
        return undefined;
    }
  }

  /**
   * Runs a moderation action and reloads, so the row reflects the server's
   * view rather than an optimistic guess.
   *
   * @param action - Builds the request to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   */
  private runAction(
    action: () => Observable<ModeratedUser>,
    successMessage: string,
    failureMessage: string,
  ): void {
    this.errorMessage = '';
    this.successMessage = '';

    action()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: () => {
          this.successMessage = successMessage;
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof HttpErrorResponse &&
            (error.status === HttpStatusCode.Forbidden ||
              error.status === HttpStatusCode.BadRequest)
              ? 'Administrator accounts, including your own, cannot be moderated.'
              : failureMessage;
        },
      });
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
