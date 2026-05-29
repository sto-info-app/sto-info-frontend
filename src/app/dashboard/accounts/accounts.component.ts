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
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { AccountDialogComponent } from './dialogs/account-dialog/account-dialog.component';

/**
 * View model for a single STO account card, with all display values precomputed at load time.
 */
export interface AccountVm {
  /** Unique identifier of the account. */
  id: string;
  /** The underlying STO account data. */
  account: StoAccount;
  /** Precomputed router link path for the account detail page. */
  link: string;
  /** Precomputed Font Awesome icon class for the account platform, or null if unavailable. */
  platformIcon: string | null;
  /** Precomputed display name of the account platform. */
  platformName: string;
  /** Precomputed Font Awesome icon class for the account launcher, or null if unavailable. */
  launcherIcon: string | null;
  /** Precomputed display name of the account launcher. */
  launcherName: string;
  /** Precomputed character count for display. */
  characterCount: number;
  /** Precomputed total endeavour nodes spent for display. */
  endeavourTotalNodes: number;
  /** CSS class derived from the account platform, for header colour theming. */
  platformClass: string;
  /** Router link to the Endeavour Perks page for this account. */
  endeavoursLink: string;
  /** Whether a launcher is set on this account (distinct from having a mapped icon). */
  hasLauncher: boolean;
  /** Zero-padded 4-digit endeavour node count, e.g. "0512". */
  endeavourTotalNodesDisplay: string;
  /** Local asset path for the card background image. */
  bgImagePath: string;
  /** Whether to show the username (false when it duplicates the handle). */
  showUsername: boolean;
  /** CSS class for the launcher, applied alongside platformClass for per-launcher card theming. */
  launcherClass: string;
}

/**
 * Component to list and manage STO accounts.
 */
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, RouterModule, LoadingBarComponent],
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
  private readonly _routingService = inject(RoutingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Initialises the component by fetching STO accounts.
   */
  ngOnInit(): void {
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
   * Opens the dialog to add a new STO account.
   */
  addAccount(): void {
    const dialogRef = this._dialog.open(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'add' },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this.loadAccounts();
        }
      });
  }

  /**
   * Opens the dialog to edit an existing STO account.
   *
   * @param account The account to edit.
   */
  editAccount(account: StoAccount): void {
    const dialogRef = this._dialog.open(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'edit', account },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this.loadAccounts();
        }
      });
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
      } as ConfirmDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this._stoAccountService.deleteAccount(account.id).subscribe({
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
    return {
      id: account.id,
      account,
      link: `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${this.encodeHandle(account.handle)}`,
      platformIcon: this.getPlatformIcon(account.platformId),
      platformName: this.getPlatform(account.platformId)?.name ?? 'Platform',
      launcherIcon: this.getLauncherIcon(account.launcherId),
      launcherName: this.getLauncher(account.launcherId)?.name ?? 'Launcher',
      characterCount: account.characterCount || 0,
      endeavourTotalNodes: account.endeavourTotalNodes || 0,
      platformClass: this.getPlatformClass(account.platformId),
      endeavoursLink: `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${this.encodeHandle(account.handle)}/endeavours`,
      hasLauncher: !!account.launcherId,
      endeavourTotalNodesDisplay: (account.endeavourTotalNodes || 0)
        .toString()
        .padStart(4, '0'),
      bgImagePath: this._getBgImagePath(
        this.getPlatformClass(account.platformId),
        this.getLauncher(account.launcherId)?.name,
      ),
      showUsername:
        !!account.username &&
        account.username.toLowerCase() !== account.handle.toLowerCase(),
      launcherClass: this._getLauncherClass(
        this.getPlatformClass(account.platformId),
        this.getLauncher(account.launcherId)?.name,
      ),
    };
  }

  private _getLauncherClass(
    platformClass: string,
    launcherName?: string,
  ): string {
    if (platformClass !== 'platform-pc') return '';
    const launcher = launcherName?.toLowerCase() ?? '';
    if (launcher === 'arc') return 'launcher-arc';
    if (launcher === 'epic') return 'launcher-epic';
    if (launcher === 'steam') return 'launcher-steam';
    return '';
  }

  private _getBgImagePath(
    platformClass: string,
    launcherName?: string,
  ): string {
    if (platformClass === 'platform-pc') {
      const launcher = launcherName?.toLowerCase() ?? '';
      if (launcher === 'arc')
        return '/assets/temp/account_type_windows_arc.jpg';
      if (launcher === 'epic')
        return '/assets/temp/account_type_windows_epic.jpg';
      if (launcher === 'steam')
        return '/assets/temp/account_type_windows_steam.jpg';
      return '/assets/temp/account_type_windows_default.jpg';
    }
    const map: Record<string, string> = {
      'platform-playstation': '/assets/temp/account_type_playstation.jpg',
      'platform-xbox': '/assets/temp/account_type_xbox.jpg',
      'platform-arc': '/assets/temp/account_type_windows_arc.jpg',
      'platform-epic': '/assets/temp/account_type_windows_epic.jpg',
      'platform-steam': '/assets/temp/account_type_windows_steam.jpg',
    };
    return map[platformClass] ?? '/assets/temp/account_type_default.jpg';
  }

  getPlatformClass(platformId?: string): string {
    if (!platformId) return '';
    const platform = this.platforms.find(p => p.id === platformId);
    if (!platform) return '';
    const name = platform.name.toLowerCase();
    if (name === 'playstation' || name === 'ps') return 'platform-playstation';
    if (name === 'xbox') return 'platform-xbox';
    if (name === 'steam') return 'platform-steam';
    if (name === 'windows' || name === 'pc') return 'platform-pc';
    if (name === 'arc') return 'platform-arc';
    if (name === 'epic') return 'platform-epic';
    return '';
  }
}
