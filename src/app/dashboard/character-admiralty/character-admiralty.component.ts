import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, takeUntil } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CharacterProgressBaseComponent } from '../base/character-progress-base.component';
import { CharacterProgressFiltersComponent } from '../base/character-progress-filters.component';
import { CharacterProgressStateComponent } from '../base/character-progress-state.component';
import {
  ADMIRALTY_MAX_TIER,
  ADMIRALTY_MAX_TOUR_STEP,
  ADMIRALTY_UNLOCK_LEVEL,
  CharacterAdmiraltyProgress,
  CharacterAdmiraltySummary,
} from '../models/character-admiralty.model';
import { CharacterAdmiraltyService } from '../services/character-admiralty.service';

@Component({
  selector: 'app-character-admiralty',
  standalone: true,
  templateUrl: './character-admiralty.component.html',
  styleUrls: ['./character-admiralty.component.scss'],
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
export class CharacterAdmiraltyComponent extends CharacterProgressBaseComponent<
  CharacterAdmiraltyProgress,
  CharacterAdmiraltySummary
> {
  readonly maxTier = ADMIRALTY_MAX_TIER;
  readonly maxTourStep = ADMIRALTY_MAX_TOUR_STEP;
  readonly unlockLevel = ADMIRALTY_UNLOCK_LEVEL;
  readonly featureName = 'Admiralty';
  readonly steps = Array.from({ length: 10 }, (_, index) => index + 1);

  protected readonly _loadDataErrorMessage = 'Failed to load Admiralty data';
  protected readonly _loadProgressErrorMessage =
    'Failed to load Admiralty progress';
  private readonly _service = inject(CharacterAdmiraltyService);

  itemId(item: CharacterAdmiraltyProgress): string {
    return item.campaignId;
  }
  protected itemName(item: CharacterAdmiraltyProgress): string {
    return item.campaign.name;
  }
  protected itemIconUrl(item: CharacterAdmiraltyProgress): string | null {
    return item.campaign.iconUrl;
  }
  protected itemAccent(item: CharacterAdmiraltyProgress): string | null {
    return item.campaign.accentColor;
  }
  protected fetchProgress(): Observable<CharacterAdmiraltyProgress[]> {
    return this._service.getProgress(this.characterId);
  }
  protected fetchSummary(): Observable<CharacterAdmiraltySummary> {
    return this._service.getSummary(this.characterId);
  }
  protected pushUpdate(
    campaignId: string,
    tier: number,
  ): Observable<CharacterAdmiraltyProgress> {
    const item = this.progress().find(
      progress => progress.campaignId === campaignId,
    )!;
    return this._service.updateProgress(
      this.characterId,
      campaignId,
      tier,
      item.tourOfDutyStep,
    );
  }

  /**
   * The two halves of a campaign's reward strip: what the reward is called,
   * and what it pays.
   * ---
   * The label is whatever the catalogue description names before its first
   * colon rather than a fixed "Tour reward", so a campaign whose description
   * is worded differently is not captioned with something it contradicts. A
   * description carrying no colon is all value - there is nothing in it that
   * reads as a label - and renders without one.
   *
   * @param item - The progress row whose campaign description is being split.
   * @returns The label, or null where there is none, and the value.
   */
  rewardParts(item: CharacterAdmiraltyProgress): {
    label: string | null;
    value: string;
  } {
    const description = item.campaign.description?.trim() ?? '';
    const colon = description.indexOf(':');
    if (colon === -1) {
      return { label: null, value: description };
    }
    return {
      label: description.slice(0, colon).trim(),
      value: description.slice(colon + 1).trim(),
    };
  }

  selectTier(item: CharacterAdmiraltyProgress, tier: number): void {
    this.saveValue(item, item.currentTier === tier ? tier - 1 : tier);
  }

  selectTourStep(item: CharacterAdmiraltyProgress, step: number): void {
    const newStep = item.tourOfDutyStep === step ? step - 1 : step;
    this.savingItemId.set(item.campaignId);
    this._service
      .updateProgress(
        this.characterId,
        item.campaignId,
        item.currentTier,
        newStep,
      )
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(value =>
              value.campaignId === item.campaignId
                ? { ...value, ...updated }
                : value,
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
}
