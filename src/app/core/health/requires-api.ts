import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Observable, distinctUntilChanged, filter, map, startWith } from 'rxjs';

/**
 * Determines whether the deepest activated route has a data property
 * indicating that it requires API availability.
 *
 * @param route The starting activated route.
 * @returns True if the deepest route requires API, false otherwise.
 */
export function routeRequiresApi(route: ActivatedRoute): boolean {
  let activeRoute: ActivatedRoute = route;
  while (activeRoute.firstChild) {
    activeRoute = activeRoute.firstChild;
  }
  return activeRoute.snapshot.data?.['requiresApi'] === true;
}

/**
 * Builds a stream of "does the current route need the API?".
 *
 * Shared by the header and the main content area so the two cannot disagree
 * about whether a backend problem is worth showing the user.
 *
 * @param router The router whose navigations are observed.
 * @param route The route to resolve from, normally the component's own.
 * @returns Observable emitting true while the active route requires the API.
 */
export function createRequiresApiStream(
  router: Router,
  route: ActivatedRoute,
): Observable<boolean> {
  return router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => routeRequiresApi(route)),
    distinctUntilChanged(),
  );
}
