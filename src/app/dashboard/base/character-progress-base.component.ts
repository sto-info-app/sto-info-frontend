import {
  ChangeDetectorRef,
  computed,
  Directive,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Observable, Subject, takeUntil } from 'rxjs';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';
import { HandleResolverService } from '../services/handle-resolver.service';

/**
 * Shared behaviour for character progress trackers (reputations, R&D, …).
 *
 * Each tracker shows a catalog of items with per-character numeric progress,
 * a summary bar, search/hide-complete filters and per-item accent styling.
 * Subclasses provide the item accessors and the service calls; everything
 * else (routing, loading, filtering, saving, accents, icon fallbacks) lives
 * here so the trackers stay in sync.
 */
@Directive()
export abstract class CharacterProgressBaseComponent<
  TProgress extends { status: string },
  TSummary,
>
  implements OnInit, OnDestroy
{
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

  readonly progress = signal<TProgress[]>([]);
  readonly summary = signal<TSummary | null>(null);
  /** The captain's recorded level, or null until the character resolves. */
  readonly characterLevel = signal<number | null>(null);
  readonly savingItemId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly hideComplete = signal(false);
  readonly expandedDescriptions = signal<Set<string>>(new Set());
  readonly failedIcons = signal<Set<string>>(new Set());

  /** Fallback accent when an item has no colour defined. */
  protected readonly _fallbackAccent = '#fa0';

  /**
   * Whether the captain is below the level that unlocks this tracker in game.
   * A level that has not resolved yet (or was never recorded) is never treated
   * as locked, so the tracker is only withheld on a known-too-low level.
   */
  readonly isLevelLocked = computed(() => {
    const level = this.characterLevel();
    return typeof level === 'number' && level < this.unlockLevel;
  });

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
        this.itemName(p).toLowerCase().includes(search),
      );
    return items;
  });

  private readonly _route = inject(ActivatedRoute);
  private readonly _handleResolver = inject(HandleResolverService);
  protected readonly _cdr = inject(ChangeDetectorRef);
  protected readonly _destroy$ = new Subject<void>();

  /** Message shown when the combined progress + summary load fails. */
  protected abstract readonly _loadDataErrorMessage: string;
  /** Message shown when a progress-only refresh fails. */
  protected abstract readonly _loadProgressErrorMessage: string;

  /** The in-game level at which this tracker's feature unlocks. */
  abstract readonly unlockLevel: number;
  /** Display name of the gated feature, used by the level-lock notice. */
  abstract readonly featureName: string;

  /** The catalog item id a progress row belongs to. */
  abstract itemId(item: TProgress): string;
  /** The catalog item display name, used by the search filter. */
  protected abstract itemName(item: TProgress): string;
  /** The catalog item icon URL, if any. */
  protected abstract itemIconUrl(item: TProgress): string | null;
  /** The catalog item accent colour, if any. */
  protected abstract itemAccent(item: TProgress): string | null;

  /** Fetches all progress rows for the current character. */
  protected abstract fetchProgress(): Observable<TProgress[]>;
  /** Fetches the summary for the current character. */
  protected abstract fetchSummary(): Observable<TSummary>;
  /** Persists a new progress value for one catalog item. */
  protected abstract pushUpdate(
    itemId: string,
    value: number,
  ): Observable<TProgress>;

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

  /** Link to the captain edit form, where the recorded level can be changed. */
  characterEditLink(): string[] {
    return [...this.characterLink(), 'edit'];
  }

  private resolveCharacterAndLoad(
    handle: string,
    characterHandle: string,
  ): void {
    this._handleResolver
      .resolveCharacter(handle, characterHandle)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: character => {
          this.characterId = character.id;
          this.characterLevel.set(character.level ?? null);
          this.errorMessage = '';
          // Below the unlock level there is nothing to show or track, so the
          // catalog and progress requests are skipped entirely.
          if (this.isLevelLocked()) {
            this.progress.set([]);
            this.summary.set(null);
            this.isLoading = false;
            this._cdr.detectChanges();
            return;
          }
          this.initialLoad();
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMessage = err.message;
          this._cdr.detectChanges();
        },
      });
  }

  private initialLoad(): void {
    this.isLoading = true;

    forkJoin({
      progress: this.fetchProgress(),
      summary: this.fetchSummary(),
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
          this.errorMessage = this._loadDataErrorMessage;
          this._cdr.detectChanges();
        },
      });
  }

  loadProgress(): void {
    this.isLoading = true;

    this.fetchProgress()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: data => {
          this.progress.set(data);
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = this._loadProgressErrorMessage;
          this._cdr.detectChanges();
        },
      });
  }

  protected loadSummary(): void {
    this.fetchSummary()
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

  toggleDescription(itemId: string): void {
    this.expandedDescriptions.update(set => {
      const next = new Set(set);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  /**
   * Persists a new progress value for an item and merges the server response
   * back into the local list, then refreshes the summary.
   *
   * @param progressItem - The progress row being edited.
   * @param value - The new progress value to store.
   * @returns void
   */
  protected saveValue(progressItem: TProgress, value: number): void {
    const itemId = this.itemId(progressItem);
    this.savingItemId.set(itemId);

    this.pushUpdate(itemId, value)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(p =>
              this.itemId(p) === itemId ? { ...p, ...updated } : p,
            ),
          );
          this.savingItemId.set(null);
          this.loadSummary();
          this._cdr.detectChanges();
        },
        error: () => {
          this.savingItemId.set(null);
          this._cdr.detectChanges();
        },
      });
  }

  accent(item: TProgress): string {
    return this.itemAccent(item) || this._fallbackAccent;
  }

  /** A translucent version of the item accent for row backgrounds. */
  accentTint(item: TProgress, alpha = 0.1): string {
    const hex = this.accent(item);
    const rgb = this.hexToRgb(hex);
    if (!rgb) {
      return 'transparent';
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /**
   * Ink that stays legible where the accent is used as a solid ground rather
   * than a tint - the heading bar of a panel, say.
   * ---
   * Accents come from the catalogue rather than from a curated palette, so
   * which of black and white carries cannot be settled once in a stylesheet.
   * It is decided per colour from WCAG relative luminance, at the point where
   * the two contrast equally against the ground: either side of it the winner
   * clears 4.5:1, so any accent an editor saves is readable.
   *
   * @param item - The progress row whose accent is being set on.
   * @returns A CSS colour: near-black on a light accent, white on a dark one.
   */
  accentTextColor(item: TProgress): string {
    const rgb = this.hexToRgb(this.accent(item));
    if (!rgb) {
      return '#fff';
    }
    const luminance =
      0.2126 * this.linearise(rgb.r) +
      0.7152 * this.linearise(rgb.g) +
      0.0722 * this.linearise(rgb.b);
    return luminance > 0.179 ? '#0d0d0d' : '#fff';
  }

  /** One 0-255 sRGB channel as the linear value a luminance sum wants. */
  private linearise(channel: number): number {
    const ratio = channel / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
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

  onIconError(itemId: string): void {
    this.failedIcons.update(set => {
      const next = new Set(set);
      next.add(itemId);
      return next;
    });
  }

  /** Whether to show the item's remote icon asset (vs any fallback). */
  showIcon(item: TProgress): boolean {
    return (
      !!this.itemIconUrl(item) && !this.failedIcons().has(this.itemId(item))
    );
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
