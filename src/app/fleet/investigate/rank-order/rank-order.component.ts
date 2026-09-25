import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { ROSTER_INVESTIGATE_CAPABILITY } from 'src/app/fleet/imports/roster-import.constants';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  RosterRankLabel,
  RosterRankOrder,
} from 'src/app/models/fleet-roster.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not order the ranks. */
export const RANK_ORDER_NOT_PERMITTED =
  'Ordering this Fleet’s ranks is for its roster investigators.';

/** What to say once an order is saved. */
export const RANK_ORDER_SAVED = 'The rank order is saved.';

/** What to say when somebody else changed the order first. */
export const RANK_ORDER_CHANGED_MEANWHILE =
  'Somebody changed the rank order since this page read it. It has been ' +
  'read again: check it, then make your change once more.';

/** What to say when a save failed for a reason the server did not give. */
export const RANK_ORDER_SAVE_FAILED =
  'The rank order could not be saved. Please try again.';

/** The most a reason may say, as the server allows. */
export const RANK_ORDER_REASON_LIMIT = 500;

/** A Fleet's rank order, and the Fleet it is for. */
export interface RankOrderData {
  readonly order: RosterRankOrder;
  readonly section: FleetSection;
}

/**
 * A Fleet's rank order, for its investigators to set (FC-020).
 *
 * Every label the Fleet's exports have listed is given a tier — 1 the
 * highest — or none. A move between two tiers is a promotion or a demotion
 * wherever the roster history describes it; any other change of rank stays
 * only a change. Tiers are numbered as the investigator likes, and a gap
 * between two closes up: only their order counts.
 *
 * An edit replaces the whole order, gives a reason, and sends the order as
 * this page read it, so one made after somebody else's is refused rather
 * than overwriting it (Steve's decisions of 25 September 2026).
 */
@Component({
  selector: 'app-rank-order',
  templateUrl: './rank-order.component.html',
  styleUrls: ['./rank-order.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class RankOrderComponent extends FleetSectionPageDirective<RankOrderData> {
  private readonly _rosterService = inject(RosterService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = RANK_ORDER_NOT_PERMITTED;
  readonly reasonLimit = RANK_ORDER_REASON_LIMIT;

  protected readonly _requiredCapabilities = [ROSTER_INVESTIGATE_CAPABILITY];

  /** The tier typed for each label changed since the order was read. */
  readonly drafts = signal<Readonly<Record<string, string>>>({});

  /** Why the order is being changed. */
  readonly reason = signal('');

  /** Whether a save is under way. */
  readonly busy = signal(false);

  /** What the last save came to, if it was refused or failed. */
  readonly saveError = signal<string | null>(null);

  /** What the last save came to, if it was recorded. */
  readonly saveNotice = signal<string | null>(null);

  /**
   * The labels to place, each with the tier shown for it.
   *
   * @param data - The page.
   * @returns Every label the Fleet's exports have listed.
   */
  labelsOf(data: RankOrderData): readonly RosterRankLabel[] {
    // An investigator is always sent the labels.
    return data.order.labels as RosterRankLabel[];
  }

  /**
   * The tier a label's box shows: as typed, or as the order has it.
   *
   * @param label - The label.
   * @returns The tier, or empty for none.
   */
  tierShown(label: RosterRankLabel): string {
    return this.drafts()[label.label] ?? label.tier?.toString() ?? '';
  }

  /**
   * Whether a label's box holds something that is not a tier.
   *
   * @param label - The label.
   * @returns True unless it is empty or a whole number from 1.
   */
  isInvalid(label: RosterRankLabel): boolean {
    const typed = this.tierShown(label).trim();

    return typed !== '' && !/^[1-9]\d*$/.test(typed);
  }

  /**
   * The order the boxes make, tiers highest first, with every gap closed.
   *
   * @param data - The page.
   * @returns The tiers, each a list of labels; null while a box is invalid.
   */
  proposed(data: RankOrderData): string[][] | null {
    const byTier = new Map<number, string[]>();

    for (const label of this.labelsOf(data)) {
      if (this.isInvalid(label)) {
        return null;
      }

      const typed = this.tierShown(label).trim();

      if (typed !== '') {
        const tier = Number(typed);

        byTier.set(tier, [...(byTier.get(tier) ?? []), label.label]);
      }
    }

    return [...byTier.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, labels]) => labels);
  }

  /**
   * Whether the order may be saved: every box holds a tier or nothing, the
   * order they make is not the one the Fleet has, a reason is given, and no
   * save is under way. Labels within a tier have no order, so two orders
   * differing only there are the same.
   *
   * @param data - The page.
   * @returns True when Save would send something the server could take.
   */
  canSave(data: RankOrderData): boolean {
    const tiers = this.proposed(data);

    return (
      !this.busy() &&
      tiers !== null &&
      !sameOrder(tiers, data.order.tiers) &&
      this.reason().trim() !== ''
    );
  }

  /**
   * Writes an order out, a tier at a time.
   *
   * @param tiers - The order, highest first.
   * @returns It, in words; "no order" when it is empty.
   */
  describe(tiers: readonly (readonly string[])[]): string {
    return tiers.length === 0
      ? 'no order'
      : tiers
          .map((labels, index) => `${index + 1}: ${labels.join(', ')}`)
          .join(' · ');
  }

  /**
   * Where the Investigate hub is.
   *
   * @param data - The page, with the Fleet's address.
   * @returns The router link.
   */
  investigateLink(data: RankOrderData): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetInvestigate(
      communitySlug,
      platformSegment,
      fleetSlug,
    );
  }

  /**
   * Types a tier for a label.
   *
   * @param label - The label.
   * @param tier - What was typed.
   */
  onTier(label: string, tier: string): void {
    this.drafts.update(drafts => ({ ...drafts, [label]: tier }));
  }

  /**
   * Saves the order the boxes make, when it may be saved. Pressing Enter in
   * a box submits the form whatever the button says, so this asks again.
   *
   * @param data - The page, with the order as it was read.
   */
  onSubmit(data: RankOrderData): void {
    if (!this.canSave(data)) {
      return;
    }

    // canSave has just found the boxes valid.
    const tiers = this.proposed(data) as string[][];

    this.busy.set(true);
    this.saveError.set(null);
    this.saveNotice.set(null);
    this._rosterService
      .updateRankOrder(data.section.communityId, data.section.fleetId, {
        tiers,
        expected: data.order.tiers,
        reason: this.reason().trim(),
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.drafts.set({});
          this.reason.set('');
          this.saveNotice.set(RANK_ORDER_SAVED);
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);

          if (error.status === HttpStatusCode.Conflict) {
            // What the page showed is no longer the order, so the boxes go
            // with it; the reason is kept for the second attempt.
            this.drafts.set({});
            this.saveError.set(RANK_ORDER_CHANGED_MEANWHILE);
            this.reload();

            return;
          }

          this.saveError.set(refusalOf(error));
        },
      });
  }

  /**
   * Reads the Fleet's rank order.
   *
   * @param section - The Fleet.
   * @returns The order, with the Fleet.
   */
  protected load(section: FleetSection): Observable<RankOrderData> {
    return this._rosterService
      .rankOrder(section.communityId, section.fleetId)
      .pipe(map(order => ({ order, section })));
  }
}

/**
 * Whether two orders are the same: the same tiers, in the same order, each
 * holding the same labels in any order.
 *
 * @param a - One order.
 * @param b - The other.
 * @returns True when they are.
 */
export function sameOrder(
  a: readonly (readonly string[])[],
  b: readonly (readonly string[])[],
): boolean {
  const key = (tiers: readonly (readonly string[])[]): string =>
    JSON.stringify(tiers.map(labels => [...labels].sort()));

  return key(a) === key(b);
}

/**
 * Says why a save was refused.
 *
 * @param error - The refusal.
 * @returns The server's own sentence for a request it would not take — a
 *   label no export listed, or an order that changes nothing — and a general
 *   one otherwise.
 */
function refusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return error.status === HttpStatusCode.BadRequest &&
    typeof message === 'string'
    ? message
    : RANK_ORDER_SAVE_FAILED;
}
