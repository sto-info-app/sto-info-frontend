import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DatesTimeHelperService {
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
      this.formatUnit(time.seconds, 'second')
    );
  }

  private formatUnit(value: number, unit: string): string {
    if (value > 0) {
      return value === 1 ? `${value} ${unit} ago` : `${value} ${unit}s ago`;
    }
    return '';
  }
}
