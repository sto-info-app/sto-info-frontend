import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SharedDataService {
  private readonly userIdSubject = new BehaviorSubject<string>('');
  userId = this.userIdSubject.asObservable();

  /**
   * Updates the shared user identifier stream.
   *
   * @param userId The new user identifier.
   */
  updateUserId(userId: string): void {
    this.userIdSubject.next(userId);
  }
}
