import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DatesTimeHelperService {
  /**
   * Formats the time elapsed since a date into a human-readable string.
   *
   * @param date The date or ISO string to compare against the current time.
   * @returns A relative time string such as `2 days ago` or `just now`.
   */
  timeSince(date: Date | string): string {
    const providedDate = typeof date === 'string' ? new Date(date) : date;
    const currentDate = new Date();

    const timeElapsed = currentDate.getTime() - providedDate.getTime();
    const seconds = Math.floor(timeElapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    return this.formatTimeSince({
      years,
      months,
      days,
      hours,
      minutes,
      seconds,
    });
  }

  /**
   * Selects the largest non-zero time unit from the elapsed time snapshot.
   *
   * @param time The elapsed time broken down into individual units.
   * @returns The formatted elapsed time string.
   */
  private formatTimeSince(time: {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }): string {
    return (
      this.formatUnit(time.years, 'year') ||
      this.formatUnit(time.months, 'month') ||
      this.formatUnit(time.days, 'day') ||
      this.formatUnit(time.hours, 'hour') ||
      this.formatUnit(time.minutes, 'minute') ||
      this.formatUnit(time.seconds, 'second') ||
      'just now'
    );
  }

  /**
   * Formats a single elapsed unit.
   *
   * @param value The unit value.
   * @param unit The unit label.
   * @returns The formatted unit string, or an empty string when the value is zero.
   */
  private formatUnit(value: number, unit: string): string {
    if (value > 0) {
      return value === 1 ? `${value} ${unit} ago` : `${value} ${unit}s ago`;
    }
    return '';
  }
}
