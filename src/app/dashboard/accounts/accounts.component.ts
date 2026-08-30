import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { AccountCardComponent } from 'src/app/shared/components/account-card/account-card.component';
import {
  AccountCardDetail,
  AccountCardVm,
} from 'src/app/shared/components/account-card/account-card.model';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  getAccountBgImagePath,
  getLauncherClass,
  getPlatformClass,
} from 'src/app/shared/utils/card-theme.utils';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { PrivacyModeService } from '../services/privacy-mode.service';

/**
 * View model for a single STO account card, with all display values precomputed at load time.
 */
export interface AccountVm {
  /** Unique identifier of the account. */
  id: string;
  /** The underlying STO account data. */
  account: StoAccount;
  /** Precomputed Font Awesome icon class for the account platform, or null if unavailable. */
  platformIcon: string | null;
  /** Precomputed Font Awesome icon class for the account launcher, or null if unavailable. */
  launcherIcon: string | null;
  /** Presentation model handed to the shared account card. */
  card: AccountCardVm;
}

/** Action keys emitted by the account cards on this page. */
export const ACCOUNT_CARD_EDIT = 'edit';
export const ACCOUNT_CARD_DELETE = 'delete';

/**
 * Component to list and manage STO accounts.
 */
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    AccountCardComponent,
  ],
})
export class AccountsComponent implements OnInit, OnDestroy {
  /** Precomputed router link to the main dashboard. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  /** Application route titles for navigation labels. */
  readonly appRouteTitles = APP_ROUTE_TITLES;

  /** List of STO accounts for the current user. */
  accounts: StoAccount[] = [];

  /** List of available platforms. */
  platforms: Platform[] = [];

  /** List of available launchers. */
  launchers: Launcher[] = [];

  /** Precomputed view-model rows for the account cards. */
  accountVms: AccountVm[] = [];

  /** Flag to indicate if data is being loaded. */
  isLoading = true;

  private readonly _stoAccountService = inject(StoAccountService);
  readonly privacyMode = inject(PrivacyModeService);
  private readonly _routingService = inject(RoutingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Initialises the component by fetching STO accounts.
   */
  ngOnInit(): void {
    this.privacyMode.load().pipe(takeUntil(this._destroy$)).subscribe();
    this.loadAccounts();
  }

  /**
   * Fetches the list of STO accounts, platforms, and launchers from the service,
   * then builds the precomputed view-model rows.
   */
  loadAccounts(): void {
    this.isLoading = true;
    forkJoin({
      accounts: this._stoAccountService.getAccounts(),
      platforms: this._stoAccountService.getPlatforms(),
      launchers: this._stoAccountService.getLaunchers(),
    })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: ({ accounts, platforms, launchers }) => {
          this.accounts = accounts;
          this.platforms = platforms;
          this.launchers = launchers;
          this.accountVms = accounts.map(account =>
            this._buildAccountVm(account),
          );
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.detectChanges();
        },
      });
  }

  /**
   * Navigates to the in-page account creation screen.
   */
  addAccount(): void {
    this._router.navigate(['/dashboard/accounts/add']);
  }

  /**
   * Navigates to the in-page account edit screen.
   *
   * @param account The account to edit.
   */
  editAccount(account: StoAccount): void {
    this._router.navigate([
      '/dashboard/accounts',
      this.encodeHandle(account.handle),
      'edit',
    ]);
  }

  /**
   * Deletes an STO account after user confirmation.
   *
   * @param account The account to delete.
   */
  deleteAccount(account: StoAccount): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete STO Account',
        message: `
          <p>Are you sure you want to delete account <span class="go-bluey">${account.handle}</span>?</p>
          <p><strong>WARNING:</strong> Unlike the making of Tuvix, this action cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this._stoAccountService
            .deleteAccount(account.id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              next: () => this.loadAccounts(),
              error: err => {
                this.isLoading = false;
                this._cdr.markForCheck();
                console.error('Failed to delete STO account:', err);
              },
            });
        }
      });
  }

  /**
   * Resolves a navigation route into a router link string.
   *
   * @param route Application route key.
   * @returns A router link string for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Returns the Font Awesome icon class for a given platform.
   *
   * @param platformId The platform ID.
   * @returns A Font Awesome icon class string, or null if not found.
   */
  getPlatformIcon(platformId?: string): string | null {
    if (!platformId) return null;

    const platform = this.platforms.find(p => p.id === platformId);
    if (!platform) return null;

    const name = platform.name.toLowerCase();
    if (name === 'arc') return 'fak fa-arc-games';
    if (name === 'epic') return 'fak fa-epic-games';
    if (name === 'steam') return 'fab fa-steam';
    if (name === 'windows' || name === 'pc') return 'fab fa-windows';
    if (name === 'playstation' || name === 'ps') return 'fab fa-playstation';
    if (name === 'xbox') return 'fab fa-xbox';

    return null;
  }

  /**
   * Returns the platform for a given platform ID.
   *
   * @param platformId The platform ID.
   * @returns The Platform object, or undefined if not found.
   */
  getPlatform(platformId?: string): Platform | undefined {
    if (!platformId) return undefined;
    return this.platforms.find(p => p.id === platformId);
  }

  /**
   * Returns the Font Awesome icon class for a given launcher.
   *
   * @param launcherId The launcher ID.
   * @returns A Font Awesome icon class string, or null if not found.
   */
  getLauncherIcon(launcherId?: string): string | null {
    if (!launcherId) return null;

    const launcher = this.launchers.find(l => l.id === launcherId);
    if (!launcher) return null;

    const name = launcher.name.toLowerCase();
    if (name === 'arc') return 'fak fa-arc-games';
    if (name === 'epic') return 'fak fa-epic-games';
    if (name === 'steam') return 'fab fa-steam';

    return null;
  }

  /**
   * Returns the launcher for a given launcher ID.
   *
   * @param launcherId The launcher ID.
   * @returns The Launcher object, or undefined if not found.
   */
  getLauncher(launcherId?: string): Launcher | undefined {
    if (!launcherId) return undefined;
    return this.launchers.find(l => l.id === launcherId);
  }

  /**
   * Encodes an STO handle for URL safety.
   *
   * @param handle The STO handle to encode.
   * @returns The URL-safe encoded handle.
   */
  encodeHandle(handle: string): string {
    return encodeStoHandle(handle);
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Builds a view-model for a single account card, precomputing all display values.
   * Must be called after {@link platforms} and {@link launchers} have been set.
   *
   * @param account The STO account to build a view-model for.
   * @returns A precomputed AccountVm for template binding.
   */
  private _buildAccountVm(account: StoAccount): AccountVm {
    const handleSegment = this.encodeHandle(account.handle);
    const accountLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${handleSegment}`;
    const platformClass = this.getPlatformClass(account.platformId);
    const launcherName = this.getLauncher(account.launcherId)?.name;

    return {
      id: account.id,
      account,
      platformIcon: this.getPlatformIcon(account.platformId),
      launcherIcon: this.getLauncherIcon(account.launcherId),
      card: {
        id: account.id,
        handle: account.handle,
        link: accountLink,
        themeClass: [
          platformClass,
          getLauncherClass(platformClass, launcherName),
        ]
          .filter(Boolean)
          .join(' '),
        bgImagePath:
          account.accountTypeImageUrl?.trim() ||
          getAccountBgImagePath(platformClass, launcherName),
        lifetimeSubscription: !!account.lifetimeSubscription,
        characterCount: account.characterCount || 0,
        platformName: this.getPlatform(account.platformId)?.name ?? 'Platform',
        launcherName: account.launcherId ? (launcherName ?? 'Launcher') : null,
        details: this._buildAccountDetails(account),
        endeavour: {
          totalNodes: account.endeavourTotalNodes || 0,
          link: `${accountLink}/endeavours`,
        },
        actions: [
          {
            key: ACCOUNT_CARD_EDIT,
            icon: 'fas fa-user-pen',
            title: 'Edit Account',
          },
          {
            key: ACCOUNT_CARD_DELETE,
            icon: 'fas fa-trash',
            title: 'Delete Account',
            destructive: true,
          },
        ],
      },
    };
  }

  /**
   * Builds the owner-facing detail rows shown in an account card's body.
   *
   * The username is omitted when it merely repeats the handle.
   *
   * @param account The STO account to describe.
   * @returns The detail rows for the card.
   */
  private _buildAccountDetails(account: StoAccount): AccountCardDetail[] {
    const details: AccountCardDetail[] = [];

    const showUsername =
      !!account.username &&
      account.username.toLowerCase() !== account.handle.toLowerCase();
    if (showUsername && account.username) {
      details.push({
        icon: 'fas fa-user',
        text: account.username,
        label: 'Username',
        private: true,
      });
    }

    if (account.email) {
      details.push({
        icon: 'fas fa-envelope',
        text: account.email,
        label: 'Email',
        variant: 'secondary',
        private: true,
      });
    }

    if (account.notes) {
      details.push({
        icon: 'fas fa-note-sticky',
        text: account.notes,
        label: 'Notes',
        variant: 'muted',
      });
    }

    return details;
  }

  /**
   * Routes an account card action to the matching handler.
   *
   * @param account The account the card represents.
   * @param actionKey The key emitted by the card.
   */
  onAccountCardAction(account: StoAccount, actionKey: string): void {
    if (actionKey === ACCOUNT_CARD_EDIT) {
      this.editAccount(account);
      return;
    }

    if (actionKey === ACCOUNT_CARD_DELETE) {
      this.deleteAccount(account);
    }
  }

  /**
   * Resolves the account-card theme class for a platform.
   *
   * @param platformId The platform ID.
   * @returns The theme class, or an empty string when unrecognised.
   */
  getPlatformClass(platformId?: string): string {
    return getPlatformClass(this.getPlatform(platformId)?.name);
  }
}
