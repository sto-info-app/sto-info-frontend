import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { map, Observable, skip } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetEventWhenComponent } from 'src/app/fleet/events/fleet-event-when/fleet-event-when.component';
import { FLEET_RSVP_LABELS } from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsPageDirective } from 'src/app/fleet/events/fleet-events-page.directive';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import {
  FleetCalendarEntry,
  FleetEventCalendar,
} from 'src/app/models/fleet-events.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  agendaOf,
  calendarMonthOf,
  calendarRangeOf,
  dayKeyOf,
  FleetCalendarDay,
  FleetCalendarView,
  monthGridOf,
  monthNameOf,
  shiftMonth,
} from './fleet-event-calendar.utils';

/** The widest screen the agenda is drawn on by default. */
const NARROW = '(max-width: 767px)';

/** The weekdays heading the month grid. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A month of a scope's calendar, laid out both ways. */
export interface FleetEventCalendarData {
  readonly calendar: FleetEventCalendar;
  readonly view: FleetCalendarView;
  /** YYYY-MM. */
  readonly month: string;
  /** The reader's zone, which every time is in. */
  readonly zone: string;
  readonly weeks: readonly (readonly FleetCalendarDay[])[];
  readonly agenda: readonly FleetCalendarDay[];
}

/**
 * A Community's, a Fleet's or an Armada's calendar (FC-030).
 *
 * Steve's decision of 28 September 2026: a month grid, with a toggle to an
 * agenda, the agenda by default on a narrow screen. The view and the month
 * are in the address, so each is a link of its own. Times are in the
 * reader's own zone, which the page names. Its event managers are offered a
 * new event while the scope is open.
 */
@Component({
  selector: 'app-fleet-event-calendar',
  templateUrl: './fleet-event-calendar.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetEventWhenComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class FleetEventCalendarComponent extends FleetEventsPageDirective<FleetEventCalendarData> {
  private readonly _router = inject(Router);
  private readonly _settings = inject(UserSettingsService);

  readonly weekdays = WEEKDAYS;
  readonly responseLabels = FLEET_RSVP_LABELS;

  constructor() {
    super();

    // The address carries the view and the month; a change to either reads
    // the calendar again.
    this._route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  /**
   * Names a month.
   *
   * @param month - YYYY-MM.
   * @returns Such as "December 2029".
   */
  monthName(month: string): string {
    return monthNameOf(month);
  }

  /**
   * Names a day of the agenda.
   *
   * @param key - YYYY-MM-DD.
   * @returns Such as "Friday 7 December".
   */
  dayName(key: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
      .format(new Date(`${key}T00:00:00Z`))
      .replace(',', '');
  }

  /**
   * Where an entry's occurrence is.
   *
   * @param scope - The scope.
   * @param entry - The entry.
   * @returns The router link.
   */
  entryLinkOf(scope: GovernanceScopeVm, entry: FleetCalendarEntry): string[] {
    return this.occurrenceLinkOf(scope, entry.event.id, entry.occurrence.id);
  }

  /**
   * Shows the calendar another way.
   *
   * @param view - Month or agenda.
   */
  onView(view: FleetCalendarView): void {
    this.navigate({ view });
  }

  /**
   * Shows another month.
   *
   * @param data - What is shown.
   * @param by - How many months on, or back when negative.
   */
  onMonth(data: FleetEventCalendarData, by: number): void {
    this.navigate({ month: shiftMonth(data.month, by) });
  }

  /** Goes back to the current month. */
  onToday(): void {
    this.navigate({ month: null });
  }

  /**
   * Reads the month the address asks for, and lays it out.
   *
   * @param scope - The scope.
   * @returns The month.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetEventCalendarData> {
    const query = this._route.snapshot.queryParamMap;
    const zone = this._settings.displayTimezone();
    const now = new Date();
    const month = calendarMonthOf(query.get('month'), now, zone);
    const asked = query.get('view');
    const view: FleetCalendarView =
      asked === 'month' || asked === 'agenda'
        ? asked
        : prefersAgenda()
          ? 'agenda'
          : 'month';
    const { from, to } = calendarRangeOf(month);
    const today = dayKeyOf(now, zone);

    return this._events.calendar(scope.target, from, to).pipe(
      map(calendar => ({
        calendar,
        view,
        month,
        zone,
        weeks: monthGridOf(month, calendar.entries, today, zone),
        agenda: agendaOf(month, calendar.entries, today, zone),
      })),
    );
  }

  /**
   * Changes the address's view or month, keeping the rest.
   *
   * @param params - What changes.
   */
  private navigate(params: Record<string, string | null>): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}

/**
 * Whether the screen is narrow enough to draw the agenda by default.
 *
 * @returns True on a narrow screen.
 */
function prefersAgenda(): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(NARROW).matches
  );
}
