import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { AccountDialogComponent } from './dialogs/account-dialog/account-dialog.component';

/**
 * Component to list and manage STO accounts.
 */
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    FontAwesomeModule,
    LoadingBarComponent,
  ],
})
export class AccountsComponent implements OnInit, OnDestroy {
  /** Application routes for navigation. */
  appRoutes = APP_ROUTES;

  /** List of STO accounts for the current user. */
  accounts: StoAccount[] = [];

  /** List of available platforms. */
  platforms: Platform[] = [];

  /** List of available launchers. */
  launchers: Launcher[] = [];

  /** Flag to indicate if data is being loaded. */
  isLoading = true;

  private readonly stoAccountService = inject(StoAccountService);
  private readonly routingService = inject(RoutingService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy$ = new Subject<void>();

  /**
   * Initializes the component by fetching STO accounts.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.loadAccounts();
  }

  /**
   * Fetches the list of STO accounts from the service.
   */
  loadAccounts(): void {
    this.isLoading = true;
    forkJoin({
      accounts: this.stoAccountService.getAccounts(),
      platforms: this.stoAccountService.getPlatforms(),
      launchers: this.stoAccountService.getLaunchers(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ accounts, platforms, launchers }) => {
          this.accounts = accounts;
          this.platforms = platforms;
          this.launchers = launchers;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  /**
   * Opens the dialog to add a new STO account.
   *
   * @returns void
   */
  addAccount(): void {
    const dialogRef = this.dialog.open(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAccounts();
      }
    });
  }

  /**
   * Opens the dialog to edit an existing STO account.
   *
   * @param account The account to edit.
   * @returns void
   */
  editAccount(account: StoAccount): void {
    const dialogRef = this.dialog.open(AccountDialogComponent, {
      width: '500px',
      data: { mode: 'edit', account },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAccounts();
      }
    });
  }

  /**
   * Deletes an STO account after user confirmation.
   *
   * @param account The account to delete.
   * @returns void
   */
  deleteAccount(account: StoAccount): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
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
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.stoAccountService.deleteAccount(account.id).subscribe(() => {
            this.loadAccounts();
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
    return this.routingService.getLink(route);
  }

  /**
   * Returns the Font Awesome icon for a given platform.
   *
   * @param platformId The platform ID.
   * @returns An array representing the Font Awesome icon.
   */
  getPlatformIcon(platformId?: string): [IconPrefix, IconName] | null {
    if (!platformId) return null;

    const platform = this.platforms.find(p => p.id === platformId);
    if (!platform) return null;

    const name = platform.name.toLowerCase();
    if (name === 'arc') return ['fak', 'arc-games' as IconName];
    if (name === 'epic') return ['fak', 'epic-games' as IconName];
    if (name === 'steam') return ['fab', 'steam'];
    if (name === 'windows' || name === 'pc') return ['fab', 'windows'];
    if (name === 'playstation' || name === 'ps') return ['fab', 'playstation'];
    if (name === 'xbox') return ['fab', 'xbox'];

    return null;
  }

  /**
   * Returns the platform for a given platform ID.
   *
   * @param platformId The platform ID.
   * @returns The platform object or undefined.
   */
  getPlatform(platformId?: string): Platform | undefined {
    if (!platformId) return undefined;
    return this.platforms.find(p => p.id === platformId);
  }

  /**
   * Returns the Font Awesome icon for a given launcher.
   *
   * @param launcherId The launcher ID.
   * @returns An array representing the Font Awesome icon.
   */
  getLauncherIcon(launcherId?: string): [IconPrefix, IconName] | null {
    if (!launcherId) return null;

    const launcher = this.launchers.find(l => l.id === launcherId);
    if (!launcher) return null;

    const name = launcher.name.toLowerCase();
    if (name === 'arc') return ['fak', 'arc-games' as IconName];
    if (name === 'epic') return ['fak', 'epic-games' as IconName];
    if (name === 'steam') return ['fab', 'steam'];

    return null;
  }

  /**
   * Returns the launcher for a given launcher ID.
   *
   * @param launcherId The launcher ID.
   * @returns The launcher object or undefined.
   */
  getLauncher(launcherId?: string): Launcher | undefined {
    if (!launcherId) return undefined;
    return this.launchers.find(l => l.id === launcherId);
  }

  /**
   * Encodes an STO handle for URL safety.
   */
  encodeHandle(handle: string): string {
    return encodeStoHandle(handle);
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
