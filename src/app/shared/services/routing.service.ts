import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  homeRoutes = ['HOME', '', '/'];

  /**
   * Translates a route constant into a path string.
   *
   * @param route The route key to look up.
   * @returns The path string starting with /.
   */
  getLink(route: string): string {
    if (this.homeRoutes.includes(route)) return '/';
    return '/' + route;
  }
}
