import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  private readonly _document = inject(DOCUMENT);
  private userAcceptedCookies: string[] = [];

  /**
   * Checks whether a cookie category has been accepted.
   *
   * @param category The cookie category to look up.
   * @returns `true` when the category is present in the accepted list.
   */
  public isCookieCategoryAccepted(category: string): boolean {
    return this.userAcceptedCookies.includes(category);
  }

  /**
   * Replaces the accepted cookie categories with a new list.
   *
   * @param acceptedCookieCategories The cookie categories accepted by the user.
   */
  public setUserAcceptedCookieCategories(
    acceptedCookieCategories: string[],
  ): void {
    this.userAcceptedCookies = acceptedCookieCategories;
  }

  /**
   * Emits the current cookie status.
   */
  private readonly cookieStatusSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  /**
   * Emits cookie status changes for consumers.
   */
  public cookieStatus$: Observable<boolean> =
    this.cookieStatusSubject.asObservable();

  /**
   * Updates the current cookie status.
   *
   * @param status The new cookie status.
   */
  setCookieStatus(status: boolean): void {
    this.cookieStatusSubject.next(status);
  }

  /**
   * Gets the current cookie status.
   *
   * @returns The latest emitted cookie status.
   */
  getCookieStatus(): boolean {
    return this.cookieStatusSubject.getValue();
  }

  /**
   * Reads a cookie value and updates the tracked cookie status.
   *
   * @param cookieName The cookie name to inspect.
   */
  getSpecificCookieStatus(cookieName: string): void {
    const cookies = this._document.cookie
      .split(';')
      .map(cookie => cookie.trim());
    const targetCookie = cookies.find(cookie =>
      cookie.startsWith(`${cookieName}=`),
    );

    const cookieValue = targetCookie ? targetCookie.split('=')[1] : 'false';
    const status = cookieValue === 'true';

    if (this.cookieStatusSubject.getValue() !== status) {
      this.cookieStatusSubject.next(status);
    }
  }

  /**
   * Creates or updates a cookie with the given expiry.
   *
   * @param cookieName The cookie name.
   * @param cookieValue The cookie value.
   * @param days The number of days before the cookie expires.
   */
  createCookie(cookieName: string, cookieValue: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    this._document.cookie = `${cookieName}=${cookieValue};${expires};path=/;SameSite=Lax;Secure`;
  }

  /**
   * Deletes the named test cookie.
   *
   * @param cookieName The cookie name.
   */
  deleteTestCookie(cookieName: string): void {
    this._document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;SameSite=Lax;Secure`;
  }

  /**
   * Reads a cookie value by name.
   *
   * @param cookieName The cookie name.
   * @returns The cookie value when present, otherwise `null`.
   */
  readCookie(cookieName: string): string | null {
    const name = `${cookieName}=`;
    const decodedCookie = decodeURIComponent(this._document.cookie);
    const cookies = decodedCookie.split(';');
    for (const cookie of cookies) {
      if (cookie.trim().startsWith(name)) {
        return cookie.trim().substring(name.length, cookie.length);
      }
    }
    return null;
  }
}
