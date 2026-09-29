import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * When an occurrence is (FC-030).
 *
 * In the reader's own zone, as every instant on the site is, and always with
 * the event's own clock beside it: an event is organised on one zone and
 * read in many, and a reader should never have to wonder which one a time is
 * in. Where the two zones agree it says so; where they differ it gives the
 * event's time and zone, with the day where that differs too.
 */
@Component({
  selector: 'app-fleet-event-when',
  template: `<span class="fleet-event-when">
    <time [attr.datetime]="startsAt()">{{
      startsAt() | appDate: 'EEE d MMM y, HH:mm'
    }}</time
    >–<time [attr.datetime]="endsAt()">{{ endsAt() | appDate: 'HH:mm' }}</time
    >&ngsp;<span class="fleet-event-when__zone">{{ zoneNote() }}</span>
  </span>`,
  styleUrls: ['./fleet-event-when.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe],
})
export class FleetEventWhenComponent {
  private readonly _settings = inject(UserSettingsService);

  /** When it starts, an ISO instant. */
  readonly startsAt = input.required<string>();

  /** When it ends, an ISO instant. */
  readonly endsAt = input.required<string>();

  /** The IANA zone the event's clock follows. */
  readonly timezone = input.required<string>();

  /** Which zone the times are in, and the event's own where it differs. */
  readonly zoneNote = computed(() => {
    const event = this.timezone();
    const reader = this._settings.displayTimezone();
    const start = new Date(this.startsAt());

    if (clockOf(start, reader) === clockOf(start, event)) {
      return `(${event} time)`;
    }

    const sameDay = dayOf(start, reader) === dayOf(start, event);

    return `your time · ${sameDay ? '' : `${dayOf(start, event)} `}${timeOf(
      start,
      event,
    )} ${event}`;
  });
}

/**
 * The wall clock at an instant in a zone, to compare two zones by.
 *
 * @param instant - The instant.
 * @param zone - The zone.
 * @returns Its day and time there.
 */
function clockOf(instant: Date, zone: string): string {
  return `${dayOf(instant, zone)} ${timeOf(instant, zone)}`;
}

/**
 * The time of day at an instant in a zone.
 *
 * @param instant - The instant.
 * @param zone - The zone.
 * @returns Such as "20:00".
 */
function timeOf(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

/**
 * The day at an instant in a zone.
 *
 * @param instant - The instant.
 * @param zone - The zone.
 * @returns Such as "Fri 7 Dec".
 */
function dayOf(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(instant)
    .replace(',', '');
}
