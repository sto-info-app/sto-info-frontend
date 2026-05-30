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
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { EndeavourSummary } from 'src/app/dashboard/models/endeavour.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { EndeavourService } from 'src/app/dashboard/services/endeavour.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { EndeavourRankBadgeComponent } from 'src/app/shared/components/endeavour-rank-badge/endeavour-rank-badge.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_R2_PUBLIC_URL,
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
  SRC_PHOTO_UNAVAILABLE_100PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';

/** Precomputed display values for a single character card. */
interface CharacterVm {
  id: string;
  character: Character;
  /** Router link segments for navigating to this character. */
  link: string[];
  /** CSS class derived from the character's general faction. */
  factionClass: string;
  /** CSS class derived from the character's career class. */
  classCategory: string;
  /** Font Awesome icon name for the character's sex. */
  sexIcon: string;
  /** Resolved profile image URL (or fallback when unavailable). */
  imageUrl: string;
}

/** Aggregated, sorted filter options derived from the character list. */
interface CharacterFilterOptionsVm {
  ranks: string[];
  species: string[];
  factions: string[];
  generalFactions: string[];
  sexes: string[];
  classes: string[];
  recruitTypes: string[];
}

@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    MatButtonModule,
    MatDialogModule,
    EndeavourRankBadgeComponent,
  ],
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  // ── Non-signal state (changed infrequently via HTTP callbacks) ────────────
  account: StoAccount | null = null;
  isLoading = true;
  endeavourCollapsed = false;
  errorMessage = '';

  // ── Signal-based state ────────────────────────────────────────────────────

  /** Loaded character array; drives all filter computed values and the character VM. */
  readonly characters = signal<Character[]>([]);

  /** Set of character IDs whose profile images failed to load. */
  failedImageIds: Set<string> = new Set();
  /** Signal mirror of failedImageIds — drives VM image-URL recomputation. */
  private readonly _failedImageIds = signal<ReadonlySet<string>>(new Set());

  /** Whether the filter panel is collapsed. */
  filtersCollapsed = false;

  /** Free-text search filter. */
  readonly searchText = signal('');
  /** Rank level-range filter. */
  readonly filterRank = signal('');
  /** Species filter. */
  readonly filterSpecies = signal('');
  /** Faction filter. */
  readonly filterFaction = signal('');
  /** General-faction (allegiance) filter. */
  readonly filterGeneralFaction = signal('');
  /** Sex filter. */
  readonly filterSex = signal('');
  /** Career-class filter. */
  readonly filterClass = signal('');
  /** Recruit-type filter. */
  readonly filterRecruitType = signal('');

  // ── Injected services ─────────────────────────────────────────────────────

  readonly endeavourSummary = signal<EndeavourSummary | null>(null);

  /** Router link for the Endeavour Perks page for the current account. */
  endeavoursLink(): string | null {
    return this.account
      ? `/dashboard/accounts/${encodeStoHandle(this.account.handle)}/endeavours`
      : null;
  }

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _characterService = inject(CharacterService);
  private readonly _endeavourService = inject(EndeavourService);
  private readonly _dialog = inject(MatDialog);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  // ── Precomputed static links ──────────────────────────────────────────────

  readonly unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_100PX;

  /** Router link for the Accounts list page. */
  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;
  /** Router link for the Dashboard home. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  // ── Computed filter-option lists (update only when characters change) ─────

  /** Sorted unique rank level-ranges derived from the current character list. */
  readonly uniqueRanks = computed(() => this._filterOptions().ranks);

  /** Sorted unique species names derived from the current character list. */
  readonly uniqueSpecies = computed(() => this._filterOptions().species);

  /** Sorted unique faction names derived from the current character list. */
  readonly uniqueFactions = computed(() => this._filterOptions().factions);

  /** Sorted unique general-faction names derived from the current character list. */
  readonly uniqueGeneralFactions = computed(
    () => this._filterOptions().generalFactions,
  );

  /** Sorted unique sex names derived from the current character list. */
  readonly uniqueSexes = computed(() => this._filterOptions().sexes);

  /** Sorted unique class names derived from the current character list. */
  readonly uniqueClasses = computed(() => this._filterOptions().classes);

  /** Sorted unique recruit-type names derived from the current character list. */
  readonly uniqueRecruitTypes = computed(
    () => this._filterOptions().recruitTypes,
  );

  /**
   * Build all filter option lists in one pass to avoid repeating map/filter/sort
   * work for each individual filter category.
   */
  private readonly _filterOptions = computed<CharacterFilterOptionsVm>(() => {
    const ranks = new Set<string>();
    const species = new Set<string>();
    const factions = new Set<string>();
    const generalFactions = new Set<string>();
    const sexes = new Set<string>();
    const classes = new Set<string>();
    const recruitTypes = new Set<string>();

    for (const character of this.characters()) {
      if (character.rank?.levelRange) ranks.add(character.rank.levelRange);
      if (character.species?.name) species.add(character.species.name);
      if (character.faction?.name) factions.add(character.faction.name);
      if (character.generalFaction?.name) {
        generalFactions.add(character.generalFaction.name);
      }
      if (character.sex?.name) sexes.add(character.sex.name);
      if (character.class?.name) classes.add(character.class.name);
      if (character.recruitType?.name) {
        recruitTypes.add(character.recruitType.name);
      }
    }

    const toSortedArray = (values: Set<string>): string[] =>
      [...values].sort((a, b) => a.localeCompare(b));

    return {
      ranks: toSortedArray(ranks),
      species: toSortedArray(species),
      factions: toSortedArray(factions),
      generalFactions: toSortedArray(generalFactions),
      sexes: toSortedArray(sexes),
      classes: toSortedArray(classes),
      recruitTypes: toSortedArray(recruitTypes),
    };
  });

  /** Number of currently active filters. */
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchText()) count++;
    if (this.filterRank()) count++;
    if (this.filterSpecies()) count++;
    if (this.filterFaction()) count++;
    if (this.filterGeneralFaction()) count++;
    if (this.filterSex()) count++;
    if (this.filterClass()) count++;
    if (this.filterRecruitType()) count++;
    return count;
  });

  // ── Computed character view-model and filtered views ─────────────────────

  /**
   * Full list of character view-models, rebuilt whenever the characters array
   * or the set of failed image IDs changes.
   */
  private readonly _characterVms = computed<CharacterVm[]>(() => {
    const chars = this.characters();
    const failedIds = this._failedImageIds();
    const accountHandle = this.account?.handle ?? '';
    return chars.map(c => ({
      id: c.id,
      character: c,
      link: ['/dashboard/accounts', encodeStoHandle(accountHandle), c.handle],
      factionClass: this.getFactionClass(c),
      classCategory: this.getClassCategory(c),
      sexIcon: this.getSexIcon(c),
      imageUrl: failedIds.has(c.id)
        ? this.unavailablePhotoSrc
        : this.getProfileImageUrl(c),
    }));
  });

  /**
   * Filtered character view-models based on all active filter signals.
   * Used directly by the template to avoid per-card method calls.
   */
  readonly filteredVms = computed<CharacterVm[]>(() =>
    this._characterVms().filter(vm =>
      this._characterMatchesFilters(vm.character),
    ),
  );

  /**
   * Filtered character list (Character[] projection of filteredVms).
   * Kept for test compatibility with specs that check filteredCharacters directly.
   */
  readonly filteredCharacters = computed<Character[]>(() =>
    this.filteredVms().map(vm => vm.character),
  );

  // ── Private filter helpers ────────────────────────────────────────────────

  private _characterMatchesFilters(c: Character): boolean {
    if (this.searchText() && !this._matchesSearch(c)) return false;

    return (
      [
        [this.filterRank(), c.rank?.levelRange],
        [this.filterSpecies(), c.species?.name],
        [this.filterFaction(), c.faction?.name],
        [this.filterGeneralFaction(), c.generalFaction?.name],
        [this.filterSex(), c.sex?.name],
        [this.filterClass(), c.class?.name],
        [this.filterRecruitType(), c.recruitType?.name],
      ] as [string, string | undefined][]
    ).every(([filter, value]) => !filter || value === filter);
  }

  private _matchesSearch(c: Character): boolean {
    const term = this.searchText().toLowerCase();
    return [c.handle, c.firstName, c.lastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Resets all active filters to their default empty values. */
  clearFilters(): void {
    this.searchText.set('');
    this.filterRank.set('');
    this.filterSpecies.set('');
    this.filterFaction.set('');
    this.filterGeneralFaction.set('');
    this.filterSex.set('');
    this.filterClass.set('');
    this.filterRecruitType.set('');
  }

  ngOnInit(): void {
    this._route.params.pipe(takeUntil(this._destroy$)).subscribe(params => {
      const handle = decodeStoHandle(params['handle']);
      if (handle) {
        this.loadAccountData(handle);
      }
    });
  }

  /** Fetches the account matching the given handle and then loads its characters. */
  loadAccountData(handle: string): void {
    this.isLoading = true;
    this._stoAccountService
      .getAccounts()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: accounts => {
          this.account = accounts.find(a => a.handle === handle) || null;
          if (this.account) {
            this.loadCharacters(this.account.id);
            this.loadEndeavourSummary(this.account.id);
          } else {
            this.isLoading = false;
            this.errorMessage = 'Account not found';
            this._cdr.detectChanges();
          }
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load account details';
          this._cdr.detectChanges();
          console.error(err);
        },
      });
  }

  /** Fetches all characters for the given account ID. */
  loadCharacters(accountId: string): void {
    this._characterService
      .getCharactersByAccount(accountId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: characters => {
          this.characters.set(characters);
          this.isLoading = false;
          // The signal cascade from characters.set() triggers re-render,
          // which also picks up the updated isLoading value.
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load characters';
          this._cdr.detectChanges();
          console.error(err);
        },
      });
  }

  loadEndeavourSummary(accountId: string): void {
    this._endeavourService
      .getSummary(accountId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: summary => {
          this.endeavourSummary.set(summary);
          this._cdr.detectChanges();
        },
        error: () => {
          // Non-critical — fail silently
        },
      });
  }

  editAccount(): void {
    if (!this.account) return;

    this._router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.account.handle),
      'edit',
    ]);
  }

  addCharacter(): void {
    if (!this.account) return;
    this._router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.account.handle),
      'characters',
      'add',
    ]);
  }

  editCharacter(character: Character): void {
    if (!this.account) return;
    this._router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.account.handle),
      character.handle,
      'edit',
    ]);
  }

  deleteCharacter(character: Character): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Character',
        message: `Are you sure you want to delete ${character.handle}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this._characterService.deleteCharacter(character.id).subscribe({
            next: () => {
              if (this.account) this.loadCharacters(this.account.id);
            },
            error: err => {
              console.error('Failed to delete character', err);
            },
          });
        }
      });
  }

  /**
   * Returns the router link segments for navigating to a character detail page.
   * Kept public for test compatibility; the template uses precomputed VM links.
   */
  getCharacterLink(character: Character): string[] {
    return [
      '/dashboard/accounts',
      encodeStoHandle(this.account?.handle || ''),
      character.handle,
    ];
  }

  getRouteLink(route: string): string {
    return `/${route}`;
  }

  /** Returns the CSS class name derived from the character's general faction. */
  getFactionClass(character: Character): string {
    return (
      character.generalFaction?.name?.toLowerCase().replaceAll(/\s+/g, '-') ||
      'unknown'
    );
  }

  /** Returns the career-class category string for CSS styling. */
  getClassCategory(character: Character): string {
    const className = character.class?.name?.toLowerCase() || '';
    if (className.includes('tactical')) return 'tactical';
    if (className.includes('engineering')) return 'engineering';
    if (className.includes('science')) return 'science';
    return 'unknown';
  }

  /** Returns the Font Awesome icon name representing the character's sex. */
  getSexIcon(character: Character): string {
    const sex = character.sex?.name?.toLowerCase() || '';
    if (sex === 'male') return 'mars';
    if (sex === 'female') return 'venus';
    return 'circle-question';
  }

  /**
   * Records that a character's profile image failed to load, updates the
   * reactive signal so the VM recomputes with the fallback URL, and keeps
   * the public Set in sync for test compatibility.
   */
  onProfileImageError(characterId: string): void {
    this.failedImageIds.add(characterId);
    this._failedImageIds.update(ids => {
      const next = new Set(ids);
      next.add(characterId);
      return next;
    });
  }

  /**
   * Returns the resolved profile image URL for a character.
   * Kept public for test compatibility; the template uses precomputed VM imageUrl.
   */
  getProfileImageUrl(character: Character): string {
    if (this.failedImageIds.has(character.id)) {
      return this.unavailablePhotoSrc;
    }

    if (character.profilePicture100) {
      return this._formatImageUrl(
        character.profilePicture100,
        CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
      );
    }
    if (character.profilePicture300) {
      return this._formatImageUrl(
        character.profilePicture300,
        CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
      );
    }
    if (character.profilePicture) {
      return this._formatImageUrl(character.profilePicture);
    }
    return this.unavailablePhotoSrc;
  }

  private _formatImageUrl(
    element: string,
    variant: string = CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  ): string {
    if (element.startsWith('http')) {
      return element;
    }

    if (element.startsWith('local/')) {
      return `${CLOUDFLARE_R2_PUBLIC_URL}/${element}`;
    }

    return `${BASE_CLOUDFLARE_IMAGES_URL}/${element}/${variant}`;
  }

  /** Cleans up subscriptions when the component is destroyed. */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
