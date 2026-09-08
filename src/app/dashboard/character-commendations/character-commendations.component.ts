import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CharacterProgressBaseComponent } from '../base/character-progress-base.component';
import { CharacterProgressFiltersComponent } from '../base/character-progress-filters.component';
import { CharacterProgressStateComponent } from '../base/character-progress-state.component';
import {
  CharacterCommendationProgress,
  CharacterCommendationSummary,
  COMMENDATION_ALLEGIANCES,
  COMMENDATION_KLINGON_ALLEGIANCE,
  COMMENDATION_MAX_RANK,
  COMMENDATION_RANK_CXP,
  COMMENDATION_UNLOCK_LEVEL,
} from '../models/character-commendation.model';
import { CharacterCommendationService } from '../services/character-commendation.service';

@Component({
  selector: 'app-character-commendations',
  templateUrl: './character-commendations.component.html',
  styleUrls: ['./character-commendations.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    CharacterProgressFiltersComponent,
    CharacterProgressStateComponent,
  ],
})
export class CharacterCommendationsComponent extends CharacterProgressBaseComponent<
  CharacterCommendationProgress,
  CharacterCommendationSummary
> {
  readonly maxRank = COMMENDATION_MAX_RANK;
  readonly unlockLevel = COMMENDATION_UNLOCK_LEVEL;
  readonly featureName = 'Commendations';

  private readonly _commendationService = inject(CharacterCommendationService);

  protected readonly _loadDataErrorMessage = 'Failed to load commendation data';
  protected readonly _loadProgressErrorMessage =
    'Failed to load commendation progress';

  /**
   * Whether the captain's allegiance leaves the catalogue undecidable.
   * ---
   * Diplomacy is earned Federation-side and Marauding Klingon-side, so a
   * captain recorded as "Undecided" - or with no allegiance at all - cannot be
   * shown a list that is true for them, and the tracker is withheld instead.
   */
  readonly isAllegianceLocked = computed(() => {
    const allegiance = this.characterGeneralFaction();
    return (
      allegiance === null || !COMMENDATION_ALLEGIANCES.includes(allegiance)
    );
  });

  /** Whether the captain is Klingon-aligned, and so shown the KDF artwork. */
  readonly isKlingonAligned = computed(
    () => this.characterGeneralFaction() === COMMENDATION_KLINGON_ALLEGIANCE,
  );

  protected override isFeatureLocked(): boolean {
    return this.isAllegianceLocked();
  }

  itemId(item: CharacterCommendationProgress): string {
    return item.commendationId;
  }

  protected itemName(item: CharacterCommendationProgress): string {
    return item.commendation.name;
  }

  protected itemIconUrl(item: CharacterCommendationProgress): string | null {
    if (this.isKlingonAligned() && item.commendation.iconUrlKlingon) {
      return item.commendation.iconUrlKlingon;
    }
    return item.commendation.iconUrl;
  }

  protected itemAccent(item: CharacterCommendationProgress): string | null {
    return item.commendation.accentColor;
  }

  protected fetchProgress(): Observable<CharacterCommendationProgress[]> {
    return this._commendationService.getProgress(this.characterId);
  }

  protected fetchSummary(): Observable<CharacterCommendationSummary> {
    return this._commendationService.getSummary(this.characterId);
  }

  protected pushUpdate(
    commendationId: string,
    rank: number,
  ): Observable<CharacterCommendationProgress> {
    return this._commendationService.updateProgress(
      this.characterId,
      commendationId,
      rank,
    );
  }

  /** The icon to show for a row, given the captain's allegiance. */
  iconUrl(item: CharacterCommendationProgress): string | null {
    return this.itemIconUrl(item);
  }

  updateRank(progressItem: CharacterCommendationProgress, rank: number): void {
    this.saveValue(progressItem, rank);
  }

  /**
   * Toggles a rank segment: clicking the rank already reached steps back down
   * to the one below it, so a mis-click can be undone in place.
   *
   * @param item - The progress row being edited.
   * @param rankIndex - The zero-based index of the segment clicked.
   * @returns void
   */
  selectRank(item: CharacterCommendationProgress, rankIndex: number): void {
    const newValue =
      item.currentRank === rankIndex + 1 ? rankIndex : rankIndex + 1;
    this.updateRank(item, newValue);
  }

  rangeArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  rankTitle(rankIndex: number): string {
    const rank = rankIndex + 1;
    const cxp = COMMENDATION_RANK_CXP[rank];
    return `Rank ${rank} / ${COMMENDATION_MAX_RANK} (${cxp.toLocaleString()} CXP)`;
  }

  formatRank(item: CharacterCommendationProgress): string {
    return `Rank ${item.currentRank}`;
  }
}
