import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, takeUntil } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CharacterProgressBaseComponent } from '../base/character-progress-base.component';
import { CharacterProgressStateComponent } from '../base/character-progress-state.component';
import {
  CharacterSpecializationProgress,
  CharacterSpecializationSummary,
  SPECIALIZATION_QUALIFICATION_POINTS,
  SPECIALIZATION_UNLOCK_LEVEL,
  SpecializationSlot,
  SpecializationType,
} from '../models/character-specialization.model';
import { CharacterSpecializationService } from '../services/character-specialization.service';

/** A titled group of specializations sharing the same catalog type. */
export interface SpecializationGroup {
  type: SpecializationType;
  title: string;
  items: CharacterSpecializationProgress[];
}

@Component({
  selector: 'app-character-specialization',
  templateUrl: './character-specialization.component.html',
  styleUrls: ['./character-specialization.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    CharacterProgressStateComponent,
  ],
})
export class CharacterSpecializationComponent extends CharacterProgressBaseComponent<
  CharacterSpecializationProgress,
  CharacterSpecializationSummary
> {
  readonly qualificationPoints = SPECIALIZATION_QUALIFICATION_POINTS;
  readonly unlockLevel = SPECIALIZATION_UNLOCK_LEVEL;
  readonly featureName = 'Specializations';

  /** Whether the side-column briefing is collapsed. */
  readonly briefingCollapsed = signal(false);

  /** Specialization groups the user has collapsed, keyed by catalog type. */
  readonly collapsedGroups = signal<Set<SpecializationType>>(new Set());

  /** The captain slot whose assignment is currently being saved. */
  readonly savingSlot = signal<SpecializationSlot | null>(null);

  /**
   * Specializations selectable as Primary: the Primary-capable ones, minus
   * whichever is already active as Secondary since a specialization cannot
   * occupy both slots at once.
   */
  readonly primaryOptions = computed(() =>
    this.progress().filter(
      p => p.specialization.type === 'primary' && p.slot !== 'secondary',
    ),
  );

  /**
   * Specializations selectable as Secondary: every specialization, minus
   * whichever is already active as Primary.
   */
  readonly secondaryOptions = computed(() =>
    this.progress().filter(p => p.slot !== 'primary'),
  );

  /** The specialization id active as Primary, or '' when the slot is empty. */
  readonly primarySelectionId = computed(
    () =>
      this.progress().find(p => p.slot === 'primary')?.specializationId ?? '',
  );

  /** The specialization id active as Secondary, or '' when the slot is empty. */
  readonly secondarySelectionId = computed(
    () =>
      this.progress().find(p => p.slot === 'secondary')?.specializationId ?? '',
  );

  /**
   * The filtered rows split into the Primary-capable and Secondary-only groups
   * the in-game specialization list uses. Empty groups are dropped so the
   * headings never appear above an empty list while filters are active.
   */
  readonly groupedProgress = computed<SpecializationGroup[]>(() => {
    const items = this.filteredProgress();
    return [
      {
        type: 'primary' as const,
        title: 'Primary Specializations',
        items: items.filter(i => i.specialization.type === 'primary'),
      },
      {
        type: 'secondary' as const,
        title: 'Secondary Specializations',
        items: items.filter(i => i.specialization.type === 'secondary'),
      },
    ].filter(group => group.items.length > 0);
  });

  /** Font Awesome icon per specialization name, used when no icon asset exists. */
  private readonly _specializationIcons: Record<string, string> = {
    'Command Officer': 'fa-star',
    'Intelligence Officer': 'fa-user-secret',
    'Miracle Worker': 'fa-screwdriver-wrench',
    Pilot: 'fa-jet-fighter',
    'Temporal Operative': 'fa-hourglass-half',
    Commando: 'fa-person-rifle',
    Constable: 'fa-handcuffs',
    Strategist: 'fa-chess',
  };

  private readonly _specializationService = inject(
    CharacterSpecializationService,
  );

  protected readonly _loadDataErrorMessage =
    'Failed to load specialization data';
  protected readonly _loadProgressErrorMessage =
    'Failed to load specialization progress';

  itemId(item: CharacterSpecializationProgress): string {
    return item.specializationId;
  }

  protected itemName(item: CharacterSpecializationProgress): string {
    return item.specialization.name;
  }

  protected itemIconUrl(item: CharacterSpecializationProgress): string | null {
    return item.specialization.iconUrl;
  }

  protected itemAccent(item: CharacterSpecializationProgress): string | null {
    return item.specialization.accentColor;
  }

  protected fetchProgress(): Observable<CharacterSpecializationProgress[]> {
    return this._specializationService.getProgress(this.characterId);
  }

  protected fetchSummary(): Observable<CharacterSpecializationSummary> {
    return this._specializationService.getSummary(this.characterId);
  }

  protected pushUpdate(
    specializationId: string,
    pointsSpent: number,
  ): Observable<CharacterSpecializationProgress> {
    return this._specializationService.updateProgress(
      this.characterId,
      specializationId,
      pointsSpent,
    );
  }

  /** Shows or hides the side-column briefing. */
  toggleBriefing(): void {
    this.briefingCollapsed.update(collapsed => !collapsed);
  }

  /** Whether a specialization group's list is collapsed. */
  isGroupCollapsed(type: SpecializationType): boolean {
    return this.collapsedGroups().has(type);
  }

  /**
   * Shows or hides one specialization group's list, leaving its heading bar in
   * place so the group can be expanded again.
   *
   * @param type - The catalog type identifying the group.
   * @returns void
   */
  toggleGroup(type: SpecializationType): void {
    this.collapsedGroups.update(types => {
      const next = new Set(types);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  /** The point total that fully completes a specialization. */
  maxPoints(item: CharacterSpecializationProgress): number {
    return item.specialization.maxPoints;
  }

  /**
   * Every intermediate point (1..max-1) except the qualification milestone,
   * rendered as thin ticks so each click target on the bar is visible.
   *
   * @param item - The specialization progress row.
   * @returns The tick positions to render.
   */
  pointTicks(item: CharacterSpecializationProgress): number[] {
    const max = this.maxPoints(item);
    return Array.from({ length: Math.max(max - 1, 0) }, (_, i) => i + 1).filter(
      point => point !== this.qualificationMilestone(item),
    );
  }

  /**
   * The point total that unlocks this specialization's Specialization
   * Qualification, or null for secondary-only specializations which have none.
   *
   * @param item - The specialization progress row.
   * @returns The milestone point total, or null.
   */
  qualificationMilestone(item: CharacterSpecializationProgress): number | null {
    return item.specialization.type === 'primary'
      ? this.qualificationPoints
      : null;
  }

  /**
   * Persists a new point total for a specialization, clamped to its valid range.
   * No-ops when the value is unchanged so redundant requests are avoided.
   *
   * @param progressItem - The specialization progress row being edited.
   * @param points - The requested new point total.
   * @returns void
   */
  setPoints(
    progressItem: CharacterSpecializationProgress,
    points: number,
  ): void {
    const clamped = Math.max(
      0,
      Math.min(this.maxPoints(progressItem), Math.round(points)),
    );
    if (clamped === progressItem.pointsSpent) {
      return;
    }
    this.saveValue(progressItem, clamped);
  }

  /**
   * Persists the point total chosen on a specialization's native range input.
   *
   * @param item - The specialization progress row being edited.
   * @param event - The change event from the range input.
   * @returns void
   */
  onRangeChange(item: CharacterSpecializationProgress, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setPoints(item, Number(input.value));
  }

  /**
   * Activates the specialization chosen in a slot's dropdown. An empty id clears
   * the slot by deactivating whichever specialization currently holds it. The
   * slot is exclusive, so the specialization that previously held it is released
   * locally to match what the server does.
   *
   * @param slot - The captain slot to fill or clear.
   * @param specializationId - The specialization to activate, or '' to clear.
   * @returns void
   */
  setSlot(slot: SpecializationSlot, specializationId: string): void {
    if (!specializationId) {
      this.clearSlot(slot);
      return;
    }

    const item = this.progress().find(
      p => p.specializationId === specializationId,
    );
    // Secondary-only specializations can never hold the primary slot; the
    // dropdown never offers them, and the server rejects them regardless.
    if (
      !item ||
      (slot === 'primary' && item.specialization.type !== 'primary')
    ) {
      return;
    }

    this.saveSlot(specializationId, slot, slot);
  }

  /**
   * Deactivates whichever specialization currently holds a slot, leaving it
   * empty. No-ops when the slot is already empty.
   *
   * @param slot - The captain slot to clear.
   * @returns void
   */
  private clearSlot(slot: SpecializationSlot): void {
    const current = this.progress().find(p => p.slot === slot);
    if (!current) {
      return;
    }
    this.saveSlot(current.specializationId, null, slot);
  }

  /**
   * Persists a slot assignment and merges the result back into the local list,
   * releasing the slot from whoever held it before.
   *
   * @param specializationId - The specialization being assigned or cleared.
   * @param slot - The slot to assign, or null to deactivate.
   * @param busySlot - The slot whose dropdown shows the in-flight state.
   * @returns void
   */
  private saveSlot(
    specializationId: string,
    slot: SpecializationSlot | null,
    busySlot: SpecializationSlot,
  ): void {
    this.savingSlot.set(busySlot);

    this._specializationService
      .updateSlot(this.characterId, specializationId, slot)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.progress.update(items =>
            items.map(p => {
              if (p.specializationId === specializationId) {
                return { ...p, ...updated };
              }
              // The slot is exclusive: whoever held it has been released.
              return slot && p.slot === slot ? { ...p, slot: null } : p;
            }),
          );
          this.savingSlot.set(null);
          this.loadSummary();
          this._cdr.detectChanges();
        },
        error: () => {
          this.savingSlot.set(null);
          this._cdr.detectChanges();
        },
      });
  }

  /** The label shown for a specialization's current slot, if it holds one. */
  slotLabel(item: CharacterSpecializationProgress): string | null {
    if (item.slot === 'primary') return 'Primary';
    if (item.slot === 'secondary') return 'Secondary';
    return null;
  }

  /** Font Awesome icon class for a specialization, used when no icon asset exists. */
  specializationIcon(item: CharacterSpecializationProgress): string {
    return (
      this._specializationIcons[item.specialization.name] ?? 'fa-certificate'
    );
  }
}
