import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true,
})
export class TimeFormatPipe implements PipeTransform {
  /**
   * Formats a duration in seconds as `hh:mm:ss`.
   *
   * @param value The duration in seconds.
   * @returns The formatted time string.
   */
  transform(value: number): string {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value - hours * 3600) / 60);
    const seconds = Math.floor(value - hours * 3600 - minutes * 60);

    let result = '';
    if (hours > 0) {
      result += hours + ':';
    }
    result += (minutes < 10 ? '0' + minutes : minutes) + ':';
    result += seconds < 10 ? '0' + seconds : seconds;
    return result;
  }
}
