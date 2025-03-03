import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  homeRoutes = ['HOME', '', '/'];

  getLink(route: string): string {
    if (this.homeRoutes.includes(route)) return '/';
    return '/' + route;
  }
}
