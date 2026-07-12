import { ChangeDetectorRef, Directive, OnDestroy, inject } from '@angular/core';
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
  selectedAccountId = 'all';
  isLoading = true;

  protected readonly _statsService = inject(StatsService);
  protected readonly _stoAccountService = inject(StoAccountService);
  protected readonly _routingService = inject(RoutingService);
  protected readonly _cdr = inject(ChangeDetectorRef);
  protected readonly _destroy$ = new Subject<void>();

  /** Fetches statistics, optionally filtered by the selected account. */
  abstract loadStats(): void;

  /** Handles account selection changes. */
  onAccountChange(accountId: string): void {
    this.selectedAccountId = accountId;
    this.loadStats();
  }

  /** Cleans up subscriptions. */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /** Returns the full URL for a route constant. */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /** Fetches the user's accounts. */
  protected loadAccounts(): void {
    this._stoAccountService
      .getAccounts()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: accounts => {
          this.accounts = accounts;
          this._cdr.markForCheck();
        },
      });
  }

  /** Calls the stats API and invokes onNext with the result, then sets isLoading false. */
  protected fetchStats(onNext: (stats: StatsData) => void): void {
    this.isLoading = true;
    const accountId =
      this.selectedAccountId === 'all' ? null : this.selectedAccountId;
    this._statsService
      .getStats(accountId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: stats => {
          onNext(stats);
          this.isLoading = false;
          this._cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.markForCheck();
        },
      });
  }
}
