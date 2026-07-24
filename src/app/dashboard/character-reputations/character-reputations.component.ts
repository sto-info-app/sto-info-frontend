import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsLevelLockComponent } from 'src/app/shared/components/lcars-level-lock/lcars-level-lock.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CharacterProgressBaseComponent } from '../base/character-progress-base.component';
import {
  REPUTATION_MAX_TIER,
  REPUTATION_TIER_XP,
  REPUTATION_UNLOCK_LEVEL,
  CharacterReputationProgress,
  CharacterReputationSummary,
} from '../models/character-reputation.model';
import { CharacterReputationService } from '../services/character-reputation.service';

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
    LcarsLevelLockComponent,
  ],
})
export class CharacterReputationsComponent extends CharacterProgressBaseComponent<
  CharacterReputationProgress,
  CharacterReputationSummary
> {
  readonly maxTier = REPUTATION_MAX_TIER;
  readonly unlockLevel = REPUTATION_UNLOCK_LEVEL;
  readonly featureName = 'Reputations';

  private readonly _reputationService = inject(CharacterReputationService);

  protected readonly _loadDataErrorMessage = 'Failed to load reputation data';
  protected readonly _loadProgressErrorMessage =
    'Failed to load reputation progress';

  itemId(item: CharacterReputationProgress): string {
    return item.reputationId;
  }

  protected itemName(item: CharacterReputationProgress): string {
    return item.reputation.name;
  }

  protected itemIconUrl(item: CharacterReputationProgress): string | null {
    return item.reputation.iconUrl;
  }

  protected itemAccent(item: CharacterReputationProgress): string | null {
    return item.reputation.accentColor;
  }

  protected fetchProgress(): Observable<CharacterReputationProgress[]> {
    return this._reputationService.getProgress(this.characterId);
  }

  protected fetchSummary(): Observable<CharacterReputationSummary> {
    return this._reputationService.getSummary(this.characterId);
  }

  protected pushUpdate(
    reputationId: string,
    tier: number,
  ): Observable<CharacterReputationProgress> {
    return this._reputationService.updateProgress(
      this.characterId,
      reputationId,
      tier,
    );
  }

  updateTier(progressItem: CharacterReputationProgress, tier: number): void {
    this.saveValue(progressItem, tier);
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
}
