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
  RD_BASE_RARITY,
  RD_MAX_LEVEL,
  RD_QUALITY_MILESTONES,
  CharacterRdProgress,
  CharacterRdSummary,
  StoRarity,
} from '../models/character-rd.model';
import { CharacterRdService } from '../services/character-rd.service';
import { HandleResolverService } from '../services/handle-resolver.service';

@Component({
  selector: 'app-character-rd',
  templateUrl: './character-rd.component.html',
  styleUrls: ['./character-rd.component.scss'],
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
export class CharacterRdComponent implements OnInit, OnDestroy {
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

  readonly maxLevel = RD_MAX_LEVEL;
  readonly qualityMilestones = RD_QUALITY_MILESTONES;

  /**
   * Every intermediate level (1..max-1) that is not a rarity milestone. Rendered
   * as thin ticks on the bar so users can see where to click for each level;
   * the milestone levels are shown separately with their own distinct markers.
   */
  readonly levelTicks = Array.from(
    { length: RD_MAX_LEVEL - 1 },
    (_, i) => i + 1,
  ).filter(level => !RD_QUALITY_MILESTONES.some(m => m.level === level));

  readonly progress = signal<CharacterRdProgress[]>([]);
  readonly summary = signal<CharacterRdSummary | null>(null);
  readonly savingSchoolId = signal<string | null>(null);
  readonly searchText = signal('');
  readonly hideComplete = signal(false);
  readonly expandedDescriptions = signal<Set<string>>(new Set());
  readonly failedIcons = signal<Set<string>>(new Set());

  /** Fallback accent when a school has no colour defined. */
  private readonly _fallbackAccent = '#fa0';

  /** Font Awesome icon per school name, used when no icon asset is available. */
  private readonly _schoolIcons: Record<string, string> = {
    Beams: 'fa-bolt',
    Cannons: 'fa-crosshairs',
    Projectiles: 'fa-rocket',
    'Ground Weapons': 'fa-person-rifle',
    Kits: 'fa-toolbox',
    Shields: 'fa-shield-halved',
    Engineering: 'fa-gears',
    Science: 'fa-flask',
  };

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
      items = items.filter(p => p.school.name.toLowerCase().includes(search));
    return items;
  });

  private readonly _route = inject(ActivatedRoute);
  private readonly _handleResolver = inject(HandleResolverService);
  private readonly _rdService = inject(CharacterRdService);
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
    this._handleResolver
      .resolveCharacter(handle, characterHandle)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: character => {
          this.characterId = character.id;
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
      progress: this._rdService.getProgress(this.characterId),
      summary: this._rdService.getSummary(this.characterId),
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
          this.errorMessage = 'Failed to load R&D data';
          this._cdr.detectChanges();
        },
      });
  }

  loadProgress(): void {
    this.isLoading = true;

    this._rdService
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
          this.errorMessage = 'Failed to load R&D progress';
          this._cdr.detectChanges();
        },
      });
  }

  private loadSummary(): void {
    this._rdService
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

  toggleDescription(schoolId: string): void {
    this.expandedDescriptions.update(set => {
      const next = new Set(set);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  }

  /**
   * Persists a new level for a school, clamped to the valid 0-max range. No-ops
   * when the value is unchanged so redundant requests are avoided.
   *
   * @param progressItem - The school progress row being edited.
   * @param level - The requested new level.
   * @returns void
   */
  setLevel(progressItem: CharacterRdProgress, level: number): void {
    const clamped = Math.max(0, Math.min(this.maxLevel, Math.round(level)));
    if (clamped === progressItem.currentLevel) {
      return;
    }

    const schoolId = progressItem.schoolId;
    this.savingSchoolId.set(schoolId);

    this._rdService
      .updateProgress(this.characterId, schoolId, clamped)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(p =>
              p.schoolId === schoolId ? { ...p, ...updated } : p,
            ),
          );
          this.savingSchoolId.set(null);
          this.loadSummary();
          this._cdr.detectChanges();
        },
        error: () => {
          this.savingSchoolId.set(null);
          this._cdr.detectChanges();
        },
      });
  }

  incrementLevel(item: CharacterRdProgress): void {
    this.setLevel(item, item.currentLevel + 1);
  }

  decrementLevel(item: CharacterRdProgress): void {
    this.setLevel(item, item.currentLevel - 1);
  }

  /**
   * Sets a school's level from where the user clicked along the level bar. The
   * click position is mapped proportionally onto the 0-max range.
   *
   * @param item - The school progress row being edited.
   * @param event - The pointer event on the level bar.
   * @returns void
   */
  onTrackClick(item: CharacterRdProgress, event: MouseEvent): void {
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const ratio = (event.clientX - rect.left) / rect.width;
    this.setLevel(item, ratio * this.maxLevel);
  }

  /**
   * Keyboard control for the level bar. Arrow keys nudge the level by one and
   * Home/End jump to the extremes, matching native slider semantics.
   *
   * @param item - The school progress row being edited.
   * @param event - The keyboard event on the level bar.
   * @returns void
   */
  onTrackKeydown(item: CharacterRdProgress, event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        this.incrementLevel(item);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        this.decrementLevel(item);
        break;
      case 'Home':
        this.setLevel(item, 0);
        break;
      case 'End':
        this.setLevel(item, this.maxLevel);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /** The rarity a school can currently fabricate given its level. */
  currentQuality(item: CharacterRdProgress): string {
    let quality = 'Common';
    for (const milestone of this.qualityMilestones) {
      if (item.currentLevel >= milestone.level) {
        quality = milestone.quality;
      }
    }
    return quality;
  }

  /** The core rarity utility class (`rarity-<slug>`) for a rarity slug. */
  rarityClass(rarity: StoRarity): string {
    return `rarity-${rarity}`;
  }

  /** The rarity utility class for the school's current craftable quality. */
  currentRarityClass(item: CharacterRdProgress): string {
    let rarity: StoRarity = RD_BASE_RARITY;
    for (const milestone of this.qualityMilestones) {
      if (item.currentLevel >= milestone.level) {
        rarity = milestone.rarity;
      }
    }
    return this.rarityClass(rarity);
  }

  accent(item: CharacterRdProgress): string {
    return item.school.accentColor || this._fallbackAccent;
  }

  /** A translucent version of the school accent for row backgrounds. */
  accentTint(item: CharacterRdProgress, alpha = 0.1): string {
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

  onIconError(schoolId: string): void {
    this.failedIcons.update(set => {
      const next = new Set(set);
      next.add(schoolId);
      return next;
    });
  }

  /** Whether to show the school's remote icon asset (vs the Font Awesome fallback). */
  showIcon(item: CharacterRdProgress): boolean {
    return !!item.school.iconUrl && !this.failedIcons().has(item.schoolId);
  }

  /** Font Awesome icon class for a school, used when no icon asset exists. */
  schoolIcon(item: CharacterRdProgress): string {
    return this._schoolIcons[item.school.name] ?? 'fa-flask';
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
