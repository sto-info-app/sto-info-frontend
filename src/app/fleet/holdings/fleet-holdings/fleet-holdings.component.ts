import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, Router } from '@angular/router';

import { forkJoin, map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetHoldingsService } from 'src/app/fleet/holdings/fleet-holdings.service';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetHolding,
  FleetHoldingChange,
  FleetHoldingHistoryPage,
  FleetHoldings,
  FleetHoldingTrack,
} from 'src/app/models/fleet-holdings.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** The longest reason the server keeps. */
export const HOLDING_REASON_LIMIT = 500;

/** What to say when a save failed for a reason the server did not give. */
export const HOLDING_RECORD_FAILED =
  'The tiers could not be recorded. Please try again.';

/**
 * What to say to a reader the page is not open to. Holdings are public, so
 * only the server turns anybody away, and it says the Fleet is not there.
 */
export const FLEET_HOLDINGS_NOT_PERMITTED = 'This Fleet’s holdings are hidden.';

/** A Fleet's holdings, a page of their history, and the Fleet. */
export interface FleetHoldingsData {
  readonly section: FleetSection;
  readonly holdings: FleetHoldings;
  readonly history: FleetHoldingHistoryPage;
}

/**
 * The tier of each of a Fleet's holdings, and how they changed (FC-023).
 *
 * Public, as Steve decided on 28 September 2026: whoever may see the Fleet
 * sees its tiers and history, and a member sees who recorded each change.
 * A `holdings.write` holder records one holding at a time — its own tier
 * and its departments' — each within its own range, lower as well as
 * higher, with an optional reason. Nothing is worked out from
 * contributions, and there is no XP.
 */
@Component({
  selector: 'app-fleet-holdings',
  templateUrl: './fleet-holdings.component.html',
  styleUrls: ['./fleet-holdings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    DatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetHoldingsComponent extends FleetSectionPageDirective<FleetHoldingsData> {
  private readonly _router = inject(Router);
  private readonly _holdingsService = inject(FleetHoldingsService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_HOLDINGS_NOT_PERMITTED;
  readonly reasonLimit = HOLDING_REASON_LIMIT;

  protected readonly _requiredCapabilities: readonly string[] = [];

  protected override readonly _needsRoster = false;

  /** The holding being recorded, by code. */
  readonly editing = signal<string | null>(null);

  /** The tier chosen for each track of the holding being recorded. */
  readonly draft = signal<Readonly<Record<string, number>>>({});

  /** The reason typed. */
  readonly reason = signal('');

  /** Whether a save is under way. */
  readonly busy = signal(false);

  /** What the last save came to, if it was made. */
  readonly notice = signal<string | null>(null);

  /** What the last save came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Opens a holding's form, at the tiers it has now.
   *
   * @param holding - The holding.
   */
  onRecord(holding: FleetHolding): void {
    this.editing.set(holding.code);
    this.draft.set(
      Object.fromEntries(holding.tracks.map(track => [track.code, track.tier])),
    );
    this.reason.set('');
    this.notice.set(null);
    this.error.set(null);
  }

  /** Closes the form, keeping nothing. */
  onCancel(): void {
    this.editing.set(null);
    this.error.set(null);
  }

  /**
   * Chooses a track's tier.
   *
   * @param track - The track.
   * @param value - The tier, as the select gives it.
   */
  onTier(track: FleetHoldingTrack, value: string): void {
    this.draft.update(draft => ({ ...draft, [track.code]: Number(value) }));
  }

  /**
   * The tier chosen for a track.
   *
   * @param track - The track.
   * @returns The tier in the form.
   */
  drafted(track: FleetHoldingTrack): number {
    return this.draft()[track.code] ?? track.tier;
  }

  /**
   * The tracks the form would move.
   *
   * @param holding - The holding.
   * @returns Each track whose chosen tier differs from its tier now.
   */
  changed(holding: FleetHolding): FleetHoldingTrack[] {
    return holding.tracks.filter(track => this.drafted(track) !== track.tier);
  }

  /**
   * Every tier a track may be at.
   *
   * @param track - The track.
   * @returns 0 to its highest.
   */
  tiersOf(track: FleetHoldingTrack): number[] {
    return Array.from({ length: track.maxTier + 1 }, (_, tier) => tier);
  }

  /**
   * Records the tracks the form moves. Pressing Enter submits the form
   * whatever the button says, so this checks again.
   *
   * @param section - The Fleet.
   * @param holding - The holding.
   */
  onSave(section: FleetSection, holding: FleetHolding): void {
    const moved = this.changed(holding);

    if (moved.length === 0 || this.busy()) {
      return;
    }

    const reason = this.reason().trim();

    this.busy.set(true);
    this.error.set(null);
    this._holdingsService
      .record(section.communityId, section.fleetId, holding.code, {
        tiers: moved.map(track => ({
          track: track.code,
          tier: this.drafted(track),
        })),
        ...(reason === '' ? {} : { reason }),
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.editing.set(null);
          this.notice.set(`${holding.name} recorded.`);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, HOLDING_RECORD_FAILED));
        },
      });
  }

  /**
   * Puts what a change moved as one line.
   *
   * @param change - The change.
   * @returns Each track, from and to, in the holding's order.
   */
  movesOf(change: FleetHoldingChange): string {
    return change.moves
      .map(move => `${move.trackName} ${move.from} → ${move.to}`)
      .join(', ');
  }

  /**
   * How many pages the history has.
   *
   * @param page - The page shown.
   * @returns The count, 0 when there is nothing.
   */
  totalPages(page: FleetHoldingHistoryPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Shows another page of the history.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Reads the holdings and the page of history the address asks for.
   *
   * @param section - The Fleet.
   * @param query - The address's query.
   * @returns Both, with the Fleet.
   */
  protected load(
    section: FleetSection,
    query: ParamMap,
  ): Observable<FleetHoldingsData> {
    const asked = Number(query.get('page'));
    const page = Number.isInteger(asked) && asked > 1 ? asked : 1;

    return forkJoin({
      holdings: this._holdingsService.holdings(
        section.communityId,
        section.fleetId,
      ),
      history: this._holdingsService.history(
        section.communityId,
        section.fleetId,
        page,
      ),
    }).pipe(map(({ holdings, history }) => ({ section, holdings, history })));
  }
}
