import { DatePipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';

/**
 * Renders an instant in the timezone the reader has asked for.
 *
 * Angular's own `date` pipe renders in the browser's zone unless it is handed
 * one. That is the right default and the wrong answer for somebody who works
 * across zones and wants their dates to stay put, so every instant in the
 * application goes through this instead, and the zone comes from one place
 * (R33).
 *
 * **Only for instants.** A bare calendar date — an account's creation day, when
 * somebody started playing, the day a policy took effect — is stored as
 * midnight UTC, and rendering midnight UTC anywhere west of Greenwich moves it
 * to the day before. Those keep using the plain `date` pipe, which is why this
 * is a new pipe rather than a replacement for that one.
 *
 * **The offset is resolved here, not passed through.** Angular's `DatePipe`
 * takes its `timezone` argument as an offset such as `+0100`; handed an IANA
 * name it cannot parse, it falls back to the browser's zone without
 * complaining, which looks correct on any machine that happens to be in the
 * right place. So the name is turned into the offset in force *at that instant*
 * — which is also what makes a date from last January render in GMT while one
 * from last July renders in BST.
 *
 * **Impure on purpose.** A pure pipe caches on its inputs, so a reader who
 * changes their timezone would keep seeing the old one until something else
 * about the page changed. The cost is a cache lookup per binding per change
 * detection run; the formatting itself happens once per distinct value, format
 * and zone.
 */
@Pipe({
  name: 'appDate',
  standalone: true,
  pure: false,
})
export class AppDatePipe implements PipeTransform {
  private readonly _settingsService = inject(UserSettingsService);

  /**
   * `en-US` to match the rest of the application.
   *
   * Nothing registers locale data, so Angular's own `date` pipe formats as
   * `en-US` everywhere. Using anything else here would change how every
   * converted date looks, which is not what this pipe is for.
   */
  private readonly _datePipe = new DatePipe('en-US');

  private _cacheKey: string | null = null;
  private _cached: string | null = null;

  /**
   * Formats an instant in the reader's timezone.
   *
   * @param value - The instant, as a Date, an ISO string or epoch milliseconds.
   * @param format - An Angular `DatePipe` format; defaults to `mediumDate`.
   * @returns The formatted date, or null when there is nothing to format.
   */
  transform(
    value: Date | string | number | null | undefined,
    format = 'mediumDate',
  ): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const timezone = this._settingsService.displayTimezone();
    // JSON rather than a delimiter, so a value that happens to contain the
    // separator cannot collide with a different value and format.
    const key = JSON.stringify([String(value), format, timezone]);

    if (key !== this._cacheKey) {
      this._cacheKey = key;
      this._cached = this.format(value, format, timezone);
    }

    return this._cached;
  }

  /**
   * Formats a value, returning null rather than throwing on an unusable one.
   *
   * A malformed date is a bad row, not a reason for the page around it to
   * disappear.
   *
   * @param value - The instant to format.
   * @param format - The `DatePipe` format.
   * @param timezone - The IANA zone to render in.
   * @returns The formatted date, or null.
   */
  private format(
    value: Date | string | number,
    format: string,
    timezone: string,
  ): string | null {
    try {
      return this._datePipe.transform(
        value,
        format,
        offsetAt(value, timezone) ?? undefined,
      );
    } catch {
      return null;
    }
  }
}

/**
 * The offset a timezone was at on a given instant, as `+HHMM`.
 *
 * Read from `Intl` rather than computed, so summer time is whatever the IANA
 * database says it was on the day in question rather than whatever it is today.
 *
 * @param value - The instant.
 * @param timezone - The IANA identifier.
 * @returns The offset, or null when it cannot be determined.
 */
function offsetAt(
  value: Date | string | number,
  timezone: string,
): string | null {
  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(instant);

    // `longOffset` is always the padded `GMT+01:00` form, including for UTC
    // itself, which is why this does not also have to understand a bare `GMT`.
    const name = parts.find(part => part.type === 'timeZoneName')?.value ?? '';
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);

    return match ? `${match[1]}${match[2]}${match[3]}` : null;
  } catch {
    return null;
  }
}
