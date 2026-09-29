import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { forkJoin, map, Observable, of } from 'rxjs';

import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import {
  FLEET_ADJUSTMENT_NOTES,
  FLEET_MONTH_WEEK_NAMES,
  FLEET_WEEKDAY_NAMES,
} from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsPageDirective } from 'src/app/fleet/events/fleet-events-page.directive';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { CommunityStructure } from 'src/app/models/fleet-armada.models';
import {
  FleetEventAudience,
  FleetEventDefinition,
  FleetEventDetail,
  FleetEventPreview,
  FleetEventRecurrence,
  FleetEventRole,
} from 'src/app/models/fleet-events.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { availableTimezones } from 'src/app/shared/utils/timezone.utils';

/** The capability that runs a scope's events. */
const EVENTS_MANAGE = 'events.manage';

/** How an event ends, as the form asks it. */
export type FleetEventEnds = 'NEVER' | 'ON' | 'AFTER';

/** A Fleet an event may be for. */
export interface FleetEventFleetChoice {
  readonly id: string;
  readonly name: string;
}

/** The event being changed, if any, and the Fleets it may be for. */
export interface FleetEventEditorData {
  readonly event: FleetEventDetail | null;
  readonly fleets: readonly FleetEventFleetChoice[];
}

/** Every audience, in the order offered. */
const AUDIENCES: readonly FleetEventAudience[] = [
  'PUBLIC',
  'COMMUNITY',
  'MEMBERS',
  'OFFICERS',
  'SELECTED',
];

/** Every role an event may be for. */
const ROLES: readonly { key: FleetEventRole; label: string }[] = [
  { key: 'OWNER', label: 'Owner' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'OFFICER', label: 'Officers' },
  { key: 'MEMBER', label: 'Members' },
];

/** Every kind of rule, as offered. */
const RULES: readonly { key: FleetEventRecurrence; label: string }[] = [
  { key: 'NONE', label: 'Once' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY_DAY', label: 'Monthly, on a day' },
  { key: 'MONTHLY_WEEKDAY', label: 'Monthly, on a weekday' },
];

/**
 * Writes an event, or changes one from now on (FC-030).
 *
 * For the scope's event managers while it is open; the server checks again.
 * Steve's decisions of 28 September 2026: its own page, with the rule's
 * preview beside the form, flagging every occurrence daylight saving moves
 * and every month a monthly day skips, before anything is saved. The time is
 * on the clock of the zone chosen, the Community's own unless another is.
 */
@Component({
  selector: 'app-fleet-event-editor',
  templateUrl: './fleet-event-editor.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetEventEditorComponent extends FleetEventsPageDirective<FleetEventEditorData> {
  private readonly _router = inject(Router);
  private readonly _armadas = inject(FleetArmadaService);

  override readonly notPermittedMessage =
    'Only this calendar’s event managers can write its events, while it is open.';

  readonly audiences = AUDIENCES;
  readonly roles = ROLES;
  readonly rules = RULES;
  readonly weekdayNames = FLEET_WEEKDAY_NAMES;
  readonly monthWeeks = [1, 2, 3, 4, -1];
  readonly monthWeekNames = FLEET_MONTH_WEEK_NAMES;
  readonly adjustmentNotes = FLEET_ADJUSTMENT_NOTES;
  readonly timezones = availableTimezones();

  readonly title = signal('');
  readonly description = signal('');
  readonly externalUrl = signal('');
  readonly audience = signal<FleetEventAudience>('PUBLIC');
  readonly fleetIds = signal<readonly string[]>([]);
  readonly chosenRoles = signal<readonly FleetEventRole[]>([]);
  /** Empty for the Community's own zone. */
  readonly timezone = signal('');
  readonly recurrence = signal<FleetEventRecurrence>('NONE');
  readonly startDate = signal('');
  readonly startTime = signal('20:00');
  readonly interval = signal(1);
  readonly weekdays = signal<readonly number[]>([]);
  readonly monthDay = signal(1);
  readonly monthWeek = signal(1);
  readonly monthWeekday = signal(1);
  readonly ends = signal<FleetEventEnds>('NEVER');
  readonly endsOn = signal('');
  readonly occurrenceLimit = signal(10);
  readonly durationMinutes = signal(120);
  /** Empty for no limit. */
  readonly capacity = signal('');

  /** What the rule comes to, once asked. */
  readonly preview = signal<FleetEventPreview | null>(null);

  /** The event the form was last filled from. */
  private _filledFrom: string | null = null;

  /**
   * Who each audience is, worded for the scope.
   *
   * @param scope - The scope.
   * @param audience - The audience.
   * @returns Who may see the event.
   */
  audienceLabel(
    scope: GovernanceScopeVm,
    audience: FleetEventAudience,
  ): string {
    return this.audienceOf(scope, audience);
  }

  /**
   * Whether a value is in a chosen list.
   *
   * @param list - The list.
   * @param value - The value.
   * @returns True when chosen.
   */
  has<T>(list: readonly T[], value: T): boolean {
    return list.includes(value);
  }

  /**
   * Chooses or unchooses a Fleet.
   *
   * @param fleetId - The Fleet.
   * @param checked - Whether it is now chosen.
   */
  onFleet(fleetId: string, checked: boolean): void {
    this.fleetIds.set(toggled(this.fleetIds(), fleetId, checked));
  }

  /**
   * Chooses or unchooses a role.
   *
   * @param role - The role.
   * @param checked - Whether it is now chosen.
   */
  onRole(role: FleetEventRole, checked: boolean): void {
    this.chosenRoles.set(toggled(this.chosenRoles(), role, checked));
  }

  /**
   * Chooses or unchooses a weekday.
   *
   * @param weekday - ISO, 1 Monday to 7 Sunday.
   * @param checked - Whether it is now chosen.
   */
  onWeekday(weekday: number, checked: boolean): void {
    this.weekdays.set(toggled(this.weekdays(), weekday, checked));
  }

  /**
   * Whether the form says all it needs to.
   *
   * @returns True when it has a title, a start and a length.
   */
  canSave(): boolean {
    return (
      !this.busy() &&
      this.title().trim() !== '' &&
      this.startDate() !== '' &&
      this.startTime() !== ''
    );
  }

  /**
   * Shows what the rule comes to over the next year.
   *
   * @param scope - The scope.
   */
  onPreview(scope: GovernanceScopeVm): void {
    this.run(
      this._events
        .preview(scope.target, this.definition())
        .pipe(map(preview => this.preview.set(preview))),
      () => undefined,
    );
  }

  /**
   * Saves the event, then opens it. Pressing Enter in a field submits the
   * form whatever the buttons say, so this checks again.
   *
   * @param scope - The scope.
   * @param event - The event being changed, or null for a new one.
   */
  onSave(scope: GovernanceScopeVm, event: FleetEventDetail | null): void {
    if (!this.canSave()) {
      return;
    }

    const saving =
      event === null
        ? this._events.create(scope.target, this.definition())
        : this._events.update(scope.target, event.id, this.definition());
    let savedId = event?.id ?? '';

    this.run(
      saving.pipe(map(saved => (savedId = saved.id))),
      () => void this._router.navigate(this.eventLinkOf(scope, savedId)),
    );
  }

  /**
   * Where Cancel goes: the event, or the calendar for a new one.
   *
   * @param scope - The scope.
   * @param event - The event, or null for a new one.
   * @returns The router link.
   */
  cancelLinkOf(
    scope: GovernanceScopeVm,
    event: FleetEventDetail | null,
  ): string[] {
    return event === null
      ? this.eventsLinkOf(scope)
      : this.eventLinkOf(scope, event.id);
  }

  /**
   * The event as the form describes it, with only the fields its kind of
   * rule and audience use.
   *
   * @returns The definition.
   */
  definition(): FleetEventDefinition {
    const recurrence = this.recurrence();
    const repeats = recurrence !== 'NONE';
    const capacity = this.capacity().trim();

    return {
      title: this.title().trim(),
      description: this.description(),
      externalUrl: this.externalUrl().trim() || null,
      audience: this.audience(),
      ...(this.audience() === 'SELECTED'
        ? {
            audienceFleetIds: this.fleetIds(),
            audienceRoles: this.chosenRoles(),
          }
        : {}),
      ...(this.timezone() ? { timezone: this.timezone() } : {}),
      recurrence,
      startDate: this.startDate(),
      startTime: this.startTime(),
      ...(repeats ? { interval: this.interval() } : {}),
      ...(recurrence === 'WEEKLY'
        ? { weekdays: [...this.weekdays()].sort((a, b) => a - b) }
        : {}),
      ...(recurrence === 'MONTHLY_DAY' ? { monthDay: this.monthDay() } : {}),
      ...(recurrence === 'MONTHLY_WEEKDAY'
        ? { monthWeek: this.monthWeek(), monthWeekday: this.monthWeekday() }
        : {}),
      ...(repeats && this.ends() === 'ON' ? { endsOn: this.endsOn() } : {}),
      ...(repeats && this.ends() === 'AFTER'
        ? { occurrenceLimit: this.occurrenceLimit() }
        : {}),
      durationMinutes: this.durationMinutes(),
      capacity: capacity === '' ? null : Number(capacity),
    };
  }

  /**
   * Opens only to the scope's event managers while it is open.
   *
   * @param scope - The scope.
   * @returns True when they may write its events.
   */
  protected override mayOpen(scope?: GovernanceScopeVm): boolean {
    return (
      scope !== undefined &&
      !scope.isClosed &&
      scope.capabilities.includes(EVENTS_MANAGE)
    );
  }

  /**
   * Reads the event being changed, if any, and the Fleets a Community's or
   * an Armada's event may be for.
   *
   * @param scope - The scope.
   * @returns Both.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetEventEditorData> {
    const eventId = this._route.snapshot.paramMap.get('eventId');

    return forkJoin({
      event:
        eventId === null
          ? of(null)
          : this._events.detail(scope.target, eventId),
      fleets:
        scope.tabs !== null
          ? of([])
          : this._armadas
              .communityStructure(scope.target.communityId)
              .pipe(map(fleetsOf)),
    }).pipe(
      map(data => {
        this.fill(data.event);

        return data;
      }),
    );
  }

  /**
   * Fills the form from the event, once per event, so reading it again
   * keeps what has been typed.
   *
   * @param event - The event, or null for a new one.
   */
  private fill(event: FleetEventDetail | null): void {
    if (event === null || this._filledFrom === event.id) {
      return;
    }

    this._filledFrom = event.id;
    this.title.set(event.title);
    this.description.set(event.description);
    this.externalUrl.set(event.externalUrl ?? '');
    this.audience.set(event.audience);
    this.fleetIds.set([...event.audienceFleetIds]);
    this.chosenRoles.set([...event.audienceRoles]);
    this.timezone.set(event.timezone);
    this.recurrence.set(event.recurrence);
    this.startDate.set(event.startDate);
    this.startTime.set(event.startTime);
    this.interval.set(event.interval);
    this.weekdays.set([...event.weekdays]);
    this.monthDay.set(event.monthDay ?? 1);
    this.monthWeek.set(event.monthWeek ?? 1);
    this.monthWeekday.set(event.monthWeekday ?? 1);
    this.ends.set(
      event.endsOn !== null
        ? 'ON'
        : event.occurrenceLimit !== null
          ? 'AFTER'
          : 'NEVER',
    );
    this.endsOn.set(event.endsOn ?? '');
    this.occurrenceLimit.set(event.occurrenceLimit ?? 10);
    this.durationMinutes.set(event.durationMinutes);
    this.capacity.set(event.capacity === null ? '' : String(event.capacity));
  }
}

/**
 * A list with a value added or taken out.
 *
 * @param list - The list.
 * @param value - The value.
 * @param checked - Whether it belongs in the list.
 * @returns The list as it now is.
 */
function toggled<T>(list: readonly T[], value: T, checked: boolean): T[] {
  const others = list.filter(each => each !== value);

  return checked ? [...others, value] : others;
}

/**
 * Every Fleet a Community holds, in its Armadas or none, by name.
 *
 * @param structure - The Community's shape.
 * @returns Each Fleet that can be named.
 */
function fleetsOf(structure: CommunityStructure): FleetEventFleetChoice[] {
  const refs = [
    ...structure.standaloneFleets,
    ...structure.armadas.flatMap(({ structure: shape }) => [
      ...(shape.alpha === null ? [] : [shape.alpha.fleet]),
      ...shape.betas.flatMap(beta => [
        beta.fleet,
        ...beta.gammas.map(gamma => gamma.fleet),
      ]),
    ]),
  ];

  return refs
    .filter(
      (ref): ref is typeof ref & { id: string; name: string } =>
        ref.id !== null && ref.name !== null,
    )
    .map(ref => ({ id: ref.id, name: ref.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
