import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  // Initialise the BehaviorSubject with a default 'false' value
  private readonly cookieStatusSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  // Expose the observable for components to subscribe
  public cookieStatus$: Observable<boolean> =
    this.cookieStatusSubject.asObservable();

  // Method to update the cookie status
  setCookieStatus(status: boolean): void {
    this.cookieStatusSubject.next(status);
  }

  // Method to get the current cookie status synchronously
  getCookieStatus(): boolean {
    return this.cookieStatusSubject.getValue();
  }

  // This method checks for a specific cookie name and updates the status
  getSpecificCookieStatus(cookieName: string): void {
    // Read the document cookies and split them into individual items
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    // Find the cookie with the specified name
    const targetCookie = cookies.find(cookie =>
      cookie.startsWith(`${cookieName}=`),
    );

    // Determine the cookie value (assuming a 'true'/'false' value) or default to 'false'
    const cookieValue = targetCookie ? targetCookie.split('=')[1] : 'false';
    const status = cookieValue === 'true';

    // Update the BehaviorSubject only if there's a change
    if (this.cookieStatusSubject.getValue() !== status) {
      this.cookieStatusSubject.next(status);
    }
  }
}
