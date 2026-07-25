import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsLevelLockComponent } from 'src/app/shared/components/lcars-level-lock/lcars-level-lock.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CharacterProgressBaseComponent } from '../base/character-progress-base.component';
import { CharacterProgressFiltersComponent } from '../base/character-progress-filters.component';
import {
  RD_BASE_RARITY,
  RD_MAX_LEVEL,
  RD_QUALITY_MILESTONES,
  RD_UNLOCK_LEVEL,
  CharacterRdProgress,
  CharacterRdSummary,
  StoRarity,
} from '../models/character-rd.model';
import { CharacterRdService } from '../services/character-rd.service';

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
    CharacterProgressFiltersComponent,
    LcarsErrorMessageComponent,
    LcarsLevelLockComponent,
  ],
})
export class CharacterRdComponent extends CharacterProgressBaseComponent<
  CharacterRdProgress,
  CharacterRdSummary
> {
  readonly maxLevel = RD_MAX_LEVEL;
  readonly qualityMilestones = RD_QUALITY_MILESTONES;
  readonly unlockLevel = RD_UNLOCK_LEVEL;
  readonly featureName = 'Research & Development';

  /**
   * Every intermediate level (1..max-1) that is not a rarity milestone. Rendered
   * as thin ticks on the bar so users can see where each level sits; the
   * milestone levels are shown separately with their own distinct markers.
   */
  readonly levelTicks = Array.from(
    { length: RD_MAX_LEVEL - 1 },
    (_, i) => i + 1,
  ).filter(level => !RD_QUALITY_MILESTONES.some(m => m.level === level));

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

  private readonly _rdService = inject(CharacterRdService);

  protected readonly _loadDataErrorMessage = 'Failed to load R&D data';
  protected readonly _loadProgressErrorMessage = 'Failed to load R&D progress';

  itemId(item: CharacterRdProgress): string {
    return item.schoolId;
  }

  protected itemName(item: CharacterRdProgress): string {
    return item.school.name;
  }

  protected itemIconUrl(item: CharacterRdProgress): string | null {
    return item.school.iconUrl;
  }

  protected itemAccent(item: CharacterRdProgress): string | null {
    return item.school.accentColor;
  }

  protected fetchProgress(): Observable<CharacterRdProgress[]> {
    return this._rdService.getProgress(this.characterId);
  }

  protected fetchSummary(): Observable<CharacterRdSummary> {
    return this._rdService.getSummary(this.characterId);
  }

  protected pushUpdate(
    schoolId: string,
    level: number,
  ): Observable<CharacterRdProgress> {
    return this._rdService.updateProgress(this.characterId, schoolId, level);
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
    this.saveValue(progressItem, clamped);
  }

  /**
   * Persists the level chosen on a school's native range input.
   *
   * @param item - The school progress row being edited.
   * @param event - The change event from the range input.
   * @returns void
   */
  onRangeChange(item: CharacterRdProgress, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setLevel(item, Number(input.value));
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

  /** Font Awesome icon class for a school, used when no icon asset exists. */
  schoolIcon(item: CharacterRdProgress): string {
    return this._schoolIcons[item.school.name] ?? 'fa-flask';
  }
}
