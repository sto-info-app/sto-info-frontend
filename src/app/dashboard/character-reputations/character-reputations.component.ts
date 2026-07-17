import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';
import {
  REPUTATION_MAX_TIER,
  REPUTATION_TIER_XP,
  CharacterReputationProgress,
  CharacterReputationSummary,
} from '../models/character-reputation.model';
import { CharacterService } from '../services/character.service';
import { CharacterReputationService } from '../services/character-reputation.service';
import { StoAccountService } from '../services/sto-account.service';

@Component({
  selector: 'app-character-reputations',
  templateUrl: './character-reputations.component.html',
  styleUrls: ['./character-reputations.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CharacterReputationsComponent implements OnInit, OnDestroy {
  /**
   * When true the component is rendered inside the character-detail tabbed
   * interface. The redundant page heading, character subtitle and secondary
   * navigation are suppressed since the host shell already provides them.
   */
  @Input() embedded = false;

  isLoading = true;
  errorMessage = '';
  accountHandle = '';
  characterHandle = '';
  characterId = '';
  filtersCollapsed = false;

  readonly maxTier = REPUTATION_MAX_TIER;

  readonly progress = signal<CharacterReputationProgress[]>([]);
  readonly summary = signal<CharacterReputationSummary | null>(null);
  readonly savingReputationId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly hideComplete = signal(false);
  readonly expandedDescriptions = signal<Set<string>>(new Set());
  readonly failedIcons = signal<Set<string>>(new Set());

  /** Fallback accent when a reputation has no colour defined. */
  private readonly _fallbackAccent = '#fa0';

  readonly accountLink = computed(
    () =>
      `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${encodeStoHandle(this.accountHandle)}`,
  );
  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;

  readonly completeCount = computed(
    () => this.progress().filter(p => p.status === 'complete').length,
  );
  readonly activeFilterCount = computed(
    () => (this.hideComplete() ? 1 : 0) + (this.searchText().trim() ? 1 : 0),
  );

  readonly filteredProgress = computed(() => {
    const hide = this.hideComplete();
    const search = this.searchText().trim().toLowerCase();
    let items = this.progress();
    if (hide) items = items.filter(p => p.status !== 'complete');
    if (search)
      items = items.filter(p =>
        p.reputation.name.toLowerCase().includes(search),
      );
    return items;
  });

  private readonly _route = inject(ActivatedRoute);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _characterService = inject(CharacterService);
  private readonly _reputationService = inject(CharacterReputationService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._route.params.pipe(takeUntil(this._destroy$)).subscribe(params => {
      const handle = decodeStoHandle(params['handle']);
      const characterHandle = params['characterHandle'];
      if (handle && characterHandle) {
        this.accountHandle = handle;
        this.characterHandle = characterHandle;
        this.resolveCharacterAndLoad(handle, characterHandle);
        return;
      }

      this.isLoading = false;
      this.errorMessage = 'Invalid character link';
      this._cdr.detectChanges();
    });
  }

  characterLink(): string[] {
    return [
      '/dashboard/accounts',
      encodeStoHandle(this.accountHandle),
      this.characterHandle,
    ];
  }

  private resolveCharacterAndLoad(
    handle: string,
    characterHandle: string,
  ): void {
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
          this.resolveCharacter(account.id, characterHandle);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load account details';
          this._cdr.detectChanges();
        },
      });
  }

  private resolveCharacter(accountId: string, characterHandle: string): void {
    this._characterService
      .getCharactersByAccount(accountId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: characters => {
          const character =
            characters.find(c => c.handle === characterHandle) || null;
          if (!character) {
            this.isLoading = false;
            this.errorMessage = 'Character not found';
            this._cdr.detectChanges();
            return;
          }
          this.characterId = character.id;
          this.initialLoad();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load account characters';
          this._cdr.detectChanges();
        },
      });
  }

  private initialLoad(): void {
    this.isLoading = true;

    forkJoin({
      progress: this._reputationService.getProgress(this.characterId),
      summary: this._reputationService.getSummary(this.characterId),
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
          this.errorMessage = 'Failed to load reputation data';
          this._cdr.detectChanges();
        },
      });
  }

  loadProgress(): void {
    this.isLoading = true;

    this._reputationService
      .getProgress(this.characterId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: data => {
          this.progress.set(data);
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load reputation progress';
          this._cdr.detectChanges();
        },
      });
  }

  private loadSummary(): void {
    this._reputationService
      .getSummary(this.characterId)
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

  clearFilters(): void {
    this.hideComplete.set(false);
    this.searchText.set('');
  }

  toggleDescription(reputationId: string): void {
    this.expandedDescriptions.update(set => {
      const next = new Set(set);
      if (next.has(reputationId)) {
        next.delete(reputationId);
      } else {
        next.add(reputationId);
      }
      return next;
    });
  }

  updateTier(progressItem: CharacterReputationProgress, tier: number): void {
    const reputationId = progressItem.reputationId;
    this.savingReputationId.set(reputationId);

    this._reputationService
      .updateProgress(this.characterId, reputationId, tier)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(p =>
              p.reputationId === reputationId ? { ...p, ...updated } : p,
            ),
          );
          this.savingReputationId.set(null);
          this.loadSummary();
          this._cdr.detectChanges();
        },
        error: () => {
          this.savingReputationId.set(null);
          this._cdr.detectChanges();
        },
      });
  }

  selectTier(item: CharacterReputationProgress, tierIndex: number): void {
    const newValue =
      item.currentTier === tierIndex + 1 ? tierIndex : tierIndex + 1;
    this.updateTier(item, newValue);
  }

  rangeArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  tierTitle(tierIndex: number): string {
    const tier = tierIndex + 1;
    const xp = REPUTATION_TIER_XP[tier];
    return `Tier ${tier} / ${REPUTATION_MAX_TIER} (${xp.toLocaleString()} XP)`;
  }

  formatTier(item: CharacterReputationProgress): string {
    return `Tier ${item.currentTier}`;
  }

  accent(item: CharacterReputationProgress): string {
    return item.reputation.accentColor || this._fallbackAccent;
  }

  /** A translucent version of the reputation accent for row backgrounds. */
  accentTint(item: CharacterReputationProgress, alpha = 0.1): string {
    const hex = this.accent(item);
    const rgb = this.hexToRgb(hex);
    if (!rgb) {
      return 'transparent';
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.replace('#', '');
    const expanded =
      normalized.length === 3
        ? normalized
            .split('')
            .map(c => c + c)
            .join('')
        : normalized;
    if (expanded.length !== 6) {
      return null;
    }
    const value = Number.parseInt(expanded, 16);
    if (Number.isNaN(value)) {
      return null;
    }
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  onIconError(reputationId: string): void {
    this.failedIcons.update(set => {
      const next = new Set(set);
      next.add(reputationId);
      return next;
    });
  }

  showIcon(item: CharacterReputationProgress): boolean {
    return (
      !!item.reputation.iconUrl && !this.failedIcons().has(item.reputationId)
    );
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
