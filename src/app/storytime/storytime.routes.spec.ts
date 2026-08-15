import { Route } from '@angular/router';
import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeLandingComponent } from './landing/storytime-landing.component';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';
import { STORYTIME_ROUTES } from './storytime.routes';

describe('STORYTIME_ROUTES', () => {
  const parentRoute: Route = STORYTIME_ROUTES[0];

  it('declares a single parent route', () => {
    expect(STORYTIME_ROUTES).toHaveLength(1);
    expect(parentRoute.path).toBe('');
  });

  // Guarding the parent rather than each child is what stops a route added
  // later from quietly escaping the feature switch.
  it('guards every Storytime route from the parent', () => {
    expect(parentRoute.canActivate).toEqual([StorytimeEnabledGuard]);
  });

  it('renders the landing page at the feature root', () => {
    const landing = parentRoute.children?.find(child => child.path === '');

    expect(landing?.component).toBe(StorytimeLandingComponent);
    expect(landing?.data?.['title']).toBe(APP_ROUTE_TITLES.STORYTIME);
  });

  it('places every child beneath the guarded parent', () => {
    expect(parentRoute.children?.length).toBeGreaterThan(0);
    expect(
      STORYTIME_ROUTES.every(route => route.canActivate !== undefined),
    ).toBe(true);
  });
});
