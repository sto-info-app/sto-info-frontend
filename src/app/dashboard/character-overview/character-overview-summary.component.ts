import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { catchError, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { ADMIRALTY_UNLOCK_LEVEL } from '../models/character-admiralty.model';
import {
  COMMENDATION_ALLEGIANCES,
  COMMENDATION_UNLOCK_LEVEL,
} from '../models/character-commendation.model';
import {
  CharacterOverviewSummary,
  CharacterTrackerTab,
} from '../models/character-overview.model';
import { RD_UNLOCK_LEVEL } from '../models/character-rd.model';
import { REPUTATION_UNLOCK_LEVEL } from '../models/character-reputation.model';
import { SPECIALIZATION_UNLOCK_LEVEL } from '../models/character-specialization.model';
import { CharacterOverviewService } from '../services/character-overview.service';

/** One tracker's card: where it leads, what it is called, how far along. */
export interface CharacterOverviewCard {
  tab: CharacterTrackerTab;
  label: string;
  percentage: number;
}

/**
 * What each tracker tab is gated on, and which of its figures the card
 * carries.
 * ---
 * The gates mirror the trackers' own: the level each feature unlocks at in
 * game, and for Commendations the allegiances that have a catalogue at all.
 * A tracker the tab would withhold is withheld here too, rather than shown
 * at nought as if the captain had simply not started.
 */
interface TrackerDefinition {
  tab: CharacterTrackerTab;
  label: string;
  unlockLevel: number;
  allegiances?: readonly string[];
  percentage: (summary: CharacterOverviewSummary) => number;
}

const TRACKERS: readonly TrackerDefinition[] = [
  {
    tab: 'reputations',
    label: 'Reputations',
    unlockLevel: REPUTATION_UNLOCK_LEVEL,
    percentage: summary => summary.reputation.overallCompletionPercentage,
  },
  {
    tab: 'rd',
    label: 'R&D',
    unlockLevel: RD_UNLOCK_LEVEL,
    percentage: summary => summary.rd.overallCompletionPercentage,
  },
  {
    tab: 'specializations',
    label: 'Specializations',
    unlockLevel: SPECIALIZATION_UNLOCK_LEVEL,
    percentage: summary => summary.specialization.overallCompletionPercentage,
  },
  {
    // Campaign tiers only: the Admiralty summary's percentage is built from
    // the tiers, and a Tour of Duty that pays out and resets is not progress
    // towards anything.
    tab: 'admiralty',
    label: 'Admiralty',
    unlockLevel: ADMIRALTY_UNLOCK_LEVEL,
    percentage: summary => summary.admiralty.overallCompletionPercentage,
  },
  {
    tab: 'commendations',
    label: 'Commendations',
    unlockLevel: COMMENDATION_UNLOCK_LEVEL,
    allegiances: COMMENDATION_ALLEGIANCES,
    percentage: summary => summary.commendation.overallCompletionPercentage,
  },
];

/**
 * How far a captain has come in every tracker, on the Overview tab.
 *
 * One card per tracker the captain can use, each carrying the tab's own
 * overall percentage and leading to that tab. The five figures arrive in one
 * request, and the host asks for them again whenever the reader comes back to
 * the overview, since any tab visited in between may have moved one.
 */
@Component({
  selector: 'app-character-overview-summary',
  standalone: true,
  templateUrl: './character-overview-summary.component.html',
  styleUrls: ['./character-overview-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingBarComponent],
})
export class CharacterOverviewSummaryComponent
  implements OnInit, OnChanges, OnDestroy
{
  /** The captain whose trackers are summarised. */
  @Input({ required: true }) characterId!: string;

  /** The captain's recorded level, or null where none was recorded. */
  @Input() characterLevel: number | null = null;

  /** The captain's general allegiance, or null where none was recorded. */
  @Input() generalFaction: string | null = null;

  /** Asks the host to show the tracker a card was pressed for. */
  @Output() readonly openTab = new EventEmitter<CharacterTrackerTab>();

  readonly summary = signal<CharacterOverviewSummary | null>(null);
  readonly isLoading = signal(false);
  readonly hasFailed = signal(false);
  readonly cards = signal<CharacterOverviewCard[]>([]);

  private readonly _service = inject(CharacterOverviewService);
  private readonly _load$ = new Subject<string>();
  private readonly _destroy$ = new Subject<void>();

  ngOnInit(): void {
    // A later request supersedes an earlier one still in flight, so a quick
    // return to the overview never paints a stale answer over a fresh one.
    this._load$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.hasFailed.set(false);
        }),
        switchMap(characterId =>
          this._service.getSummary(characterId).pipe(
            catchError(() => {
              this.hasFailed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntil(this._destroy$),
      )
      .subscribe(summary => {
        this.summary.set(summary);
        this.isLoading.set(false);
        this.rebuildCards();
      });

    this._load$.next(this.characterId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['characterId'] && !changes['characterId'].firstChange) {
      this._load$.next(this.characterId);
      return;
    }
    if (changes['characterLevel'] || changes['generalFaction']) {
      this.rebuildCards();
    }
  }

  /**
   * Fetches the summaries again, for a host that knows one may have moved.
   *
   * @returns void
   */
  reload(): void {
    this._load$.next(this.characterId);
  }

  /**
   * Whether a tracker is withheld from this captain, by the same gates its
   * tab applies: a known level below the unlock, or an allegiance the
   * tracker has no catalogue for. An unknown level never locks anything.
   *
   * @param tracker - The tracker being gated.
   * @returns True when the tracker's card should not be shown.
   */
  private isLocked(tracker: TrackerDefinition): boolean {
    const level = this.characterLevel;
    if (typeof level === 'number' && level < tracker.unlockLevel) return true;
    if (!tracker.allegiances) return false;
    const allegiance = this.generalFaction;
    return allegiance === null || !tracker.allegiances.includes(allegiance);
  }

  private rebuildCards(): void {
    const summary = this.summary();
    if (!summary) {
      this.cards.set([]);
      return;
    }
    this.cards.set(
      TRACKERS.filter(tracker => !this.isLocked(tracker)).map(tracker => ({
        tab: tracker.tab,
        label: tracker.label,
        percentage: tracker.percentage(summary),
      })),
    );
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
