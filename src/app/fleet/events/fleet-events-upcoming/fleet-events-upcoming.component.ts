import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { map, Observable, Subscription } from 'rxjs';

import { FleetEventWhenComponent } from 'src/app/fleet/events/fleet-event-when/fleet-event-when.component';
import {
  FLEET_EVENTS_READ_FAILED,
  FLEET_RSVP_LABELS,
} from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsService } from 'src/app/fleet/events/fleet-events.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import { FleetCalendarEntry } from 'src/app/models/fleet-events.models';

/** Which occurrences to list: a scope's next few, or the reader's own. */
export type FleetUpcomingSource =
  | {
      readonly kind: 'SCOPE';
      readonly target: GovernanceTarget;
      /** The scope's calendar, which each occurrence hangs below. */
      readonly calendarLink: string[];
    }
  | { readonly kind: 'MINE' };

/** How far ahead a scope's next few are looked for, in days. */
const LOOK_AHEAD_DAYS = 93;

/** One occurrence to list, where it leads, and whose it is. */
export interface FleetUpcomingItem {
  readonly entry: FleetCalendarEntry;
  /** The occurrence's page. */
  readonly link: string[] | string;
  /** The scope's name, for the reader's own list. */
  readonly scopeName: string | null;
}

/**
 * What is coming up (FC-030).
 *
 * Steve's decisions of 28 September 2026: a Community page shows its next
 * five occurrences and a link to the calendar; the dashboard shows the
 * reader's own next thirty days — what they answered Going or Maybe, are
 * waiting for, or asked to be reminded of — each naming its scope.
 */
@Component({
  selector: 'app-fleet-events-upcoming',
  templateUrl: './fleet-events-upcoming.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FleetEventWhenComponent, RouterLink],
})
export class FleetEventsUpcomingComponent {
  private readonly _events = inject(FleetEventsService);
  private readonly _destroyRef = inject(DestroyRef);

  /** How many to show; null for all. */
  @Input() latest: number | null = null;

  readonly responseLabels = FLEET_RSVP_LABELS;

  /** The occurrences read. */
  readonly items = signal<readonly FleetUpcomingItem[]>([]);

  /** Whether they are being read. */
  readonly loading = signal(false);

  /** What went wrong, if anything. */
  readonly error = signal<string | null>(null);

  /** Whether this is the reader's own list. */
  readonly isMine = signal(false);

  /** The scope's calendar, for a scope's list. */
  readonly calendarLink = signal<string[] | null>(null);

  private _reading: Subscription | null = null;

  @Input({ required: true }) set source(value: FleetUpcomingSource) {
    this.isMine.set(value.kind === 'MINE');
    this.calendarLink.set(value.kind === 'SCOPE' ? value.calendarLink : null);
    this.read(value);
  }

  /**
   * The occurrences to show.
   *
   * @returns All read, or only the latest.
   */
  shown(): readonly FleetUpcomingItem[] {
    return this.latest === null
      ? this.items()
      : this.items().slice(0, this.latest);
  }

  /**
   * Reads the occurrences.
   *
   * @param source - Whose.
   */
  private read(source: FleetUpcomingSource): void {
    this._reading?.unsubscribe();
    this.items.set([]);
    this.loading.set(true);
    this.error.set(null);
    this._reading = itemsOf(this._events, source)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: items => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(FLEET_EVENTS_READ_FAILED);
        },
      });
  }
}

/**
 * Reads what is coming up for a source.
 *
 * @param events - The events client.
 * @param source - Whose.
 * @returns Each occurrence to list, soonest first.
 */
function itemsOf(
  events: FleetEventsService,
  source: FleetUpcomingSource,
): Observable<FleetUpcomingItem[]> {
  if (source.kind === 'MINE') {
    return events.mine().pipe(
      map(upcoming =>
        upcoming.entries.map(entry => ({
          entry,
          link: `${entry.scope.path}/events/${entry.event.id}/occurrences/${entry.occurrence.id}`,
          scopeName: entry.scope.name,
        })),
      ),
    );
  }

  const now = new Date();

  return events
    .calendar(
      source.target,
      now.toISOString(),
      new Date(now.getTime() + LOOK_AHEAD_DAYS * 86_400_000).toISOString(),
    )
    .pipe(
      map(calendar =>
        calendar.entries
          .filter(entry => entry.occurrence.status === 'SCHEDULED')
          .map(entry => ({
            entry,
            link: [
              ...source.calendarLink,
              entry.event.id,
              'occurrences',
              entry.occurrence.id,
            ],
            scopeName: null,
          })),
      ),
    );
}
