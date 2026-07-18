import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import {
  Launcher,
  Platform,
  PlatformLauncher,
  StoAccount,
} from 'src/app/dashboard/models/sto-account.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { STO_HANDLE_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';

@Component({
  selector: 'app-account-manage',
  templateUrl: './account-manage.component.html',
  styleUrls: ['./account-manage.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LcarsToggleComponent,
    MatButtonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class AccountManageComponent implements OnInit, OnDestroy {
  errorMessage = '';
  isSubmitting = false;
  isLoading = true;
  mode: 'add' | 'edit' = 'add';

  accountForm: FormGroup;
  account: StoAccount | null = null;
  platforms: Platform[] = [];
  launchers: Launcher[] = [];
  filteredLaunchers: Launcher[] = [];
  platformLaunchers: PlatformLauncher[] = [];
  encodedHandle = '';

  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;

  get isLauncherDisabled(): boolean {
    return (
      !this.accountForm.get('platformId')?.value ||
      this.filteredLaunchers.length === 0
    );
  }

  get launcherPlaceholderText(): string {
    if (this.accountForm.get('platformId')?.value) {
      return 'Not applicable for this platform';
    }

    return 'Select a platform first';
  }

  private readonly _fb = inject(FormBuilder);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  constructor() {
    this.accountForm = this._fb.group({
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

  ngOnInit(): void {
    this.accountForm
      .get('platformId')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe((platformId: string | null) => {
        this.filterLaunchers(platformId || '');
      });

    this._route.params.pipe(takeUntil(this._destroy$)).subscribe(params => {
      this.encodedHandle = params['handle'] || '';
      this.mode = this.encodedHandle ? 'edit' : 'add';
      this.loadMetadata();
    });
  }

  loadMetadata(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      platforms: this._stoAccountService.getPlatforms(),
      launchers: this._stoAccountService.getLaunchers(),
      mappings: this._stoAccountService.getPlatformLaunchers(),
      accounts:
        this.mode === 'edit'
          ? this._stoAccountService.getAccounts()
          : of([] as StoAccount[]),
    })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: ({ platforms, launchers, mappings, accounts }) => {
          this.platforms = platforms;
          this.launchers = launchers;
          this.platformLaunchers = mappings;

          if (this.mode === 'edit') {
            const handle = decodeStoHandle(this.encodedHandle);
            this.account =
              accounts.find(account => account.handle === handle) || null;

            if (!this.account) {
              this.errorMessage = 'Account not found.';
              this.isLoading = false;
              this._cdr.markForCheck();
              return;
            }

            this.accountForm.patchValue({
              handle: this.account.handle,
              username: this.account.username,
              email: this.account.email,
              notes: this.account.notes,
              accountCreatedDate: this.account.accountCreatedDate
                ? this.account.accountCreatedDate.split('T')[0]
                : '',
              publiclyVisible: this.account.publiclyVisible,
              lifetimeSubscription: this.account.lifetimeSubscription || false,
              platformId: this.account.platformId || '',
              launcherId: this.account.launcherId || '',
            });
          }

          const platformId = this.accountForm.get('platformId')?.value;
          if (platformId) {
            this.filterLaunchers(platformId);
          }

          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: error => {
          this.errorMessage =
            'Error loading account metadata. Please try again.';
          this.isLoading = false;
          this._cdr.markForCheck();
          console.error('Error loading metadata:', error);
        },
      });
  }

  filterLaunchers(platformId: string): void {
    if (!platformId) {
      this.filteredLaunchers = [];
      this.accountForm.patchValue({ launcherId: '' }, { emitEvent: false });
      return;
    }

    const validLauncherIds = new Set(
      this.platformLaunchers
        .filter(m => m.platformId === platformId)
        .map(m => m.launcherId)
        .filter((launcherId): launcherId is string => !!launcherId),
    );

    this.filteredLaunchers = this.launchers.filter(l =>
      validLauncherIds.has(l.id),
    );

    const currentLauncherId = this.accountForm.get('launcherId')?.value;
    if (currentLauncherId && !validLauncherIds.has(currentLauncherId)) {
      this.accountForm.patchValue({ launcherId: '' }, { emitEvent: false });
    }
  }

  onSave(): void {
    if (this.accountForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    const accountData = this.accountForm.value;

    if (this.mode === 'add') {
      this._stoAccountService.createAccount(accountData).subscribe({
        next: createdAccount => {
          this.isSubmitting = false;
          this._router.navigate([
            '/dashboard/accounts',
            encodeStoHandle(createdAccount.handle),
          ]);
        },
        error: error => this.handleSaveError(error, 'creating'),
      });
      return;
    }

    if (!this.account) {
      this.isSubmitting = false;
      return;
    }

    this._stoAccountService
      .updateAccount(this.account.id, accountData)
      .subscribe({
        next: updatedAccount => {
          this.isSubmitting = false;
          const targetHandle = updatedAccount?.handle || accountData.handle;
          this._router.navigate([
            '/dashboard/accounts',
            encodeStoHandle(targetHandle),
          ]);
        },
        error: error => this.handleSaveError(error, 'updating'),
      });
  }

  private handleSaveError(
    error: unknown,
    action: 'creating' | 'updating',
  ): void {
    this.isSubmitting = false;
    const httpError = error as {
      status?: number;
      error?: { message?: string };
    };
    if (httpError.status === 409) {
      this.errorMessage =
        httpError.error?.message ||
        'A STO account with this handle already exists.';
    } else {
      this.errorMessage = `An error occurred while ${action} the account. Please try again.`;
    }
    console.error(`Error ${action} account:`, error);
    this._cdr.markForCheck();
  }

  onCancel(): void {
    if (this.mode === 'edit' && this.account) {
      this._router.navigate([
        '/dashboard/accounts',
        encodeStoHandle(this.account.handle),
      ]);
      return;
    }
    this._router.navigate(['/dashboard/accounts']);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
