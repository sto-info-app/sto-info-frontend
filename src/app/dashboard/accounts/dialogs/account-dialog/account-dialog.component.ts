import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  Launcher,
  Platform,
  PlatformLauncher,
  StoAccount,
} from 'src/app/dashboard/models/sto-account.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { STO_HANDLE_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';

/**
 * Interface for data passed to the account dialog.
 */
interface AccountDialogData {
  /** Mode of the dialog: 'add' or 'edit'. */
  mode: 'add' | 'edit';
  /** The account to edit (if mode is 'edit'). */
  account?: StoAccount;
}

/**
 * Dialog component for adding or editing an STO account.
 */
@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LcarsToggleComponent,
    MatButtonModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class AccountDialogComponent implements OnInit, OnDestroy {
  errorMessage = '';
  isSubmitting = false;
  isLoadingMetadata = false;
  accountForm: FormGroup;
  platforms: Platform[] = [];
  launchers: Launcher[] = [];
  filteredLaunchers: Launcher[] = [];
  platformLaunchers: PlatformLauncher[] = [];

  public data: AccountDialogData = inject(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);
  private readonly stoAccountService = inject(StoAccountService);
  private readonly dialogRef = inject(MatDialogRef<AccountDialogComponent>);
  private readonly destroy$ = new Subject<void>();

  /**
   * Initializes the dialog component formulas.
   */
  constructor() {
    this.accountForm = this.fb.group({
      handle: [
        '',
        [Validators.required, Validators.pattern(STO_HANDLE_PATTERN)],
      ],
      username: [''],
      email: ['', [Validators.email]],
      notes: [''],
      accountCreatedDate: [null],
      publiclyVisible: [true],
      lifetimeSubscription: [false],
      platformId: [''],
      launcherId: [''],
    });
  }

  /**
   * Initializes the component by loading platforms and launchers.
   */
  ngOnInit(): void {
    this.accountForm
      .get('platformId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((platformId: string | null) => {
        if (platformId) {
          this.filterLaunchers(platformId);
        }
      });

    this.loadMetadata();
  }

  /**
   * Loads platforms, launchers, and their mappings from the service.
   */
  loadMetadata(): void {
    this.isLoadingMetadata = true;
    this.isSubmitting = true;
    forkJoin({
      platforms: this.stoAccountService.getPlatforms(),
      launchers: this.stoAccountService.getLaunchers(),
      mappings: this.stoAccountService.getPlatformLaunchers(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ platforms, launchers, mappings }) => {
          this.platforms = platforms;
          this.launchers = launchers;
          this.platformLaunchers = mappings;
          this.isSubmitting = false;
          this.isLoadingMetadata = false;

          if (this.data.mode === 'edit' && this.data.account) {
            const acc = this.data.account;
            this.accountForm.patchValue({
              handle: acc.handle,
              username: acc.username,
              email: acc.email,
              notes: acc.notes,
              accountCreatedDate: acc.accountCreatedDate
                ? acc.accountCreatedDate.split('T')[0]
                : '',
              publiclyVisible: acc.publiclyVisible,
              lifetimeSubscription: acc.lifetimeSubscription || false,
              platformId: acc.platformId || '',
              launcherId: acc.launcherId || '',
            });
          } else if (this.accountForm.get('platformId')?.value) {
            this.filterLaunchers(this.accountForm.get('platformId')?.value);
          }
        },
        error: error => {
          this.isSubmitting = false;
          this.isLoadingMetadata = false;
          this.errorMessage = 'Error loading metadata. Please try again.';
          console.error('Error loading metadata:', error);
        },
      });
  }

  /**
   * Filters the list of launchers based on the selected platform.
   * @param platformId The selected platform ID.
   */
  filterLaunchers(platformId: string): void {
    const validLauncherIds = new Set(
      this.platformLaunchers
        .filter(m => m.platformId === platformId)
        .map(m => m.launcherId),
    );

    this.filteredLaunchers = this.launchers.filter(l =>
      validLauncherIds.has(l.id),
    );

    const currentLauncherId = this.accountForm.get('launcherId')?.value;
    if (currentLauncherId && !validLauncherIds.has(currentLauncherId)) {
      this.accountForm.patchValue({ launcherId: '' });
    }
  }

  /**
   * Submits the form and saves the account.
   */
  onSaveClick(): void {
    if (this.accountForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    const accountData = this.accountForm.value;

    if (this.data.mode === 'add') {
      this.stoAccountService.createAccount(accountData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.dialogRef.close(true);
        },
        error: error => {
          this.isSubmitting = false;
          if (error.status === 409) {
            this.errorMessage =
              error.error?.message ||
              'A STO account with this handle already exists.';
          } else {
            this.errorMessage =
              'An error occurred while creating the account. Please try again.';
          }
          console.error('Error creating account:', error);
        },
      });
    } else if (this.data.mode === 'edit' && this.data.account) {
      this.stoAccountService
        .updateAccount(this.data.account.id, accountData)
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.dialogRef.close(true);
          },
          error: error => {
            this.isSubmitting = false;
            if (error.status === 409) {
              this.errorMessage =
                error.error?.message ||
                'A STO account with this handle already exists.';
            } else {
              this.errorMessage =
                'An error occurred while updating the account. Please try again.';
            }
            console.error('Error updating account:', error);
          },
        });
    }
  }

  /**
   * Closes the dialog without saving.
   */
  onCancelClick(): void {
    this.dialogRef.close(false);
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
