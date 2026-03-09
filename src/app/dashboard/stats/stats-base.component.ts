import { Directive, OnDestroy, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { StatsService } from '../services/stats.service';
import { StatsData } from './stats.models';

/**
 * Abstract base class for stats pages.
 * Provides shared state, injections, and methods used by both
 * StatsComponent and StatDetailComponent.
 */
@Directive()
export abstract class StatsBaseComponent implements OnDestroy {
  stats: StatsData | null = null;
  accounts: StoAccount[] = [];
  selectedAccountId: string = 'all';
  isLoading = true;

  protected readonly statsService = inject(StatsService);
  protected readonly stoAccountService = inject(StoAccountService);
  protected readonly routingService = inject(RoutingService);
  protected readonly destroy$ = new Subject<void>();

  /** Fetches statistics, optionally filtered by the selected account. */
  abstract loadStats(): void;

  /** Handles account selection changes. */
  onAccountChange(accountId: string): void {
    this.selectedAccountId = accountId;
    this.loadStats();
  }

  /** Cleans up subscriptions. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Returns the full URL for a route constant. */
  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  /** Fetches the user's accounts. */
  protected loadAccounts(): void {
    this.stoAccountService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: accounts => {
          this.accounts = accounts;
        },
      });
  }
}
