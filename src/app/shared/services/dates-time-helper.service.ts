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

    if (years > 0) {
      return years === 1 ? `${years} year ago` : `${years} years ago`;
    } else if (months > 0) {
      return months === 1 ? `${months} month ago` : `${months} months ago`;
    } else if (days > 0) {
      return days === 1 ? `${days} day ago` : `${days} days ago`;
    } else if (hours > 0) {
      return hours === 1 ? `${hours} hour ago` : `${hours} hours ago`;
    } else if (minutes > 0) {
      return minutes === 1 ? `${minutes} minute ago` : `${minutes} minutes ago`;
    } else {
      return seconds === 1 ? `${seconds} second ago` : `${seconds} seconds ago`;
    }
  }
}
