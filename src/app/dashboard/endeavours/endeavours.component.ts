import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { EndeavourRankBadgeComponent } from 'src/app/shared/components/endeavour-rank-badge/endeavour-rank-badge.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TRAILING_ZEROS_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';
import {
  EndeavourCategory,
  EndeavourProgress,
  EndeavourSortBy,
  EndeavourSummary,
} from '../models/endeavour.model';
import { StoAccountService } from '../services/sto-account.service';
import { EndeavourService } from '../services/endeavour.service';

@Component({
  selector: 'app-endeavours',
  templateUrl: './endeavours.component.html',
  styleUrls: ['./endeavours.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    EndeavourRankBadgeComponent,
  ],
})
export class EndeavoursComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  accountHandle = '';
  accountId = '';
  filtersCollapsed = false;
  sortCollapsed = false;

  readonly progress = signal<EndeavourProgress[]>([]);
  readonly summary = signal<EndeavourSummary | null>(null);
  readonly categoryFilter = signal<EndeavourCategory | 'All'>('All');
  readonly sortBy = signal<EndeavourSortBy>('nodes');
  readonly sortOrder = signal<'ASC' | 'DESC'>('DESC');
  readonly savingPerkId = signal<string | null>(null);

  readonly accountLink = computed(
    () =>
      `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${encodeStoHandle(this.accountHandle)}`,
  );
  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;

  readonly rankDisplay = computed(() =>
    (this.summary()?.totalNodes ?? 0).toString().padStart(4, '0'),
  );

  readonly searchText = signal('');
  readonly hideComplete = signal(false);
  readonly completeCount = computed(
    () => this.progress().filter(p => p.status === 'complete').length,
  );
  readonly activeFilterCount = computed(
    () =>
      (this.categoryFilter() === 'All' ? 0 : 1) +
      (this.hideComplete() ? 1 : 0) +
      (this.searchText().trim() ? 1 : 0),
  );
  readonly expandedDescriptions = signal<Set<string>>(new Set());

  readonly filteredProgress = computed(() => {
    const cat = this.categoryFilter();
    const hide = this.hideComplete();
    const search = this.searchText().trim().toLowerCase();
    let items = this.progress();
    if (cat !== 'All')
      items = items.filter(p => p.endeavourPerk.category === cat);
    if (hide) items = items.filter(p => p.status !== 'complete');
    if (search)
      items = items.filter(p =>
        p.endeavourPerk.name.toLowerCase().includes(search),
      );
    return items;
  });

  private readonly _route = inject(ActivatedRoute);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _endeavourService = inject(EndeavourService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._route.params.pipe(takeUntil(this._destroy$)).subscribe(params => {
      const handle = decodeStoHandle(params['handle']);
      if (handle) {
        this.accountHandle = handle;
        this.resolveAccountAndLoad(handle);
        return;
      }

      this.isLoading = false;
      this.errorMessage = 'Invalid account link';
      this._cdr.detectChanges();
    });
  }

  private resolveAccountAndLoad(handle: string): void {
    this._stoAccountService
      .getAccounts()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: accounts => {
          const account = accounts.find(a => a.handle === handle) || null;
          if (!account) {
            this.isLoading = false;
            this.errorMessage = 'Account not found';
            this._cdr.detectChanges();
            return;
          }
          this.accountId = account.id;
          this.initialLoad();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load account details';
          this._cdr.detectChanges();
        },
      });
  }

  private initialLoad(): void {
    this.isLoading = true;
    const opts = { sortBy: this.sortBy(), sortOrder: this.sortOrder() };

    forkJoin({
      progress: this._endeavourService.getProgress(this.accountId, opts),
      summary: this._endeavourService.getSummary(this.accountId),
    })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: ({ progress, summary }) => {
          this.progress.set(progress);
          this.summary.set(summary);
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load endeavour data';
          this._cdr.detectChanges();
        },
      });
  }

  loadProgress(): void {
    this.isLoading = true;
    const opts = { sortBy: this.sortBy(), sortOrder: this.sortOrder() };

    this._endeavourService
      .getProgress(this.accountId, opts)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: data => {
          this.progress.set(data);
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load endeavour progress';
          this._cdr.detectChanges();
        },
      });
  }

  private loadSummary(): void {
    this._endeavourService
      .getSummary(this.accountId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: s => {
          this.summary.set(s);
          this._cdr.detectChanges();
        },
        error: () => {
          // Summary is non-critical; fail silently
        },
      });
  }

  setCategory(cat: EndeavourCategory | 'All'): void {
    this.categoryFilter.set(cat);
  }

  clearFilters(): void {
    this.categoryFilter.set('All');
    this.hideComplete.set(false);
    this.searchText.set('');
  }

  toggleDescription(perkId: string): void {
    this.expandedDescriptions.update(set => {
      const next = new Set(set);
      if (next.has(perkId)) {
        next.delete(perkId);
      } else {
        next.add(perkId);
      }
      return next;
    });
  }

  setSortBy(by: EndeavourSortBy): void {
    this.sortBy.set(by);
    this.sortOrder.set(by === 'nodes' ? 'DESC' : 'ASC');
    this.loadProgress();
  }

  setSortOrder(order: 'ASC' | 'DESC'): void {
    this.sortOrder.set(order);
    this.loadProgress();
  }

  toggleSortOrder(): void {
    this.sortOrder.update(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    this.loadProgress();
  }

  updateNodes(progressItem: EndeavourProgress, nodes: number): void {
    const perkId = progressItem.endeavourPerkId;
    this.savingPerkId.set(perkId);

    this._endeavourService
      .updateProgress(this.accountId, perkId, nodes)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(p =>
              p.endeavourPerkId === perkId ? { ...p, ...updated } : p,
            ),
          );
          this.savingPerkId.set(null);
          this.loadSummary();
          this._cdr.detectChanges();
        },
        error: () => {
          this.savingPerkId.set(null);
          this._cdr.detectChanges();
        },
      });
  }

  rangeArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  selectNode(item: EndeavourProgress, nodeIndex: number): void {
    const newValue =
      item.currentNodes === nodeIndex + 1 ? nodeIndex : nodeIndex + 1;
    this.updateNodes(item, newValue);
  }

  formatEarned(item: EndeavourProgress): string {
    const unit = item.endeavourPerk.boostUnit === 'percent' ? '%' : '';
    const value = item.totalBoostEarned;
    if (value === 0) return '+0' + unit;
    const display = Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2).replace(TRAILING_ZEROS_PATTERN, '');
    return `+${display}${unit}`;
  }

  trackByPerkId(_: number, item: EndeavourProgress): string {
    return item.endeavourPerkId;
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
