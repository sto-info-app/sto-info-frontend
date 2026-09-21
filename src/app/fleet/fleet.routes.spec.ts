import { Route } from '@angular/router';

import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';

import { FleetHomeComponent } from './fleet-home/fleet-home.component';
import { FLEET_ROUTES } from './fleet.routes';

describe('FLEET_ROUTES', () => {
  const parentRoute: Route = FLEET_ROUTES[0];
  const children = parentRoute.children ?? [];

  /**
   * Finds a child route by path.
   *
   * @param path - The path to find.
   * @returns The route.
   */
  const childAt = (path: string): Route | undefined =>
    children.find(child => child.path === path);

  it('declares one parent holding the three listings', () => {
    expect(FLEET_ROUTES).toHaveLength(1);
    expect(parentRoute.path).toBe('');
    expect(children).toHaveLength(3);
  });

  // The parent is the component that answers whether the feature is switched
  // on. A reader who followed a link to a switched-off feature should be told
  // so rather than made to wait for a chunk that will then say nothing.
  it('loads the shell eagerly rather than as a chunk of its own', () => {
    expect(parentRoute.component).toBe(FleetHomeComponent);
    expect(parentRoute.loadComponent).toBeUndefined();
  });

  it('puts the Fleet listing at the directory’s own address', () => {
    expect(childAt('')?.data?.['title']).toBe(APP_ROUTE_TITLES.FLEETS);
  });

  // `communities` and `armadas` are literal siblings of the Fleet listing,
  // which is what keeps a Community slug from ever being mistaken for a page
  // of the directory's own, however the directory grows.
  it.each([
    ['communities', APP_ROUTE_TITLES.FLEET_COMMUNITIES],
    ['armadas', APP_ROUTE_TITLES.FLEET_ARMADAS],
  ])('puts the %s listing on its own address', (path, title) => {
    expect(childAt(path)?.data?.['title']).toBe(title);
  });

  it('loads each listing only when its address is reached', () => {
    expect(
      children.every(child => typeof child.loadComponent === 'function'),
    ).toBe(true);
  });

  it.each([
    ['', 'FleetsDirectoryComponent'],
    ['communities', 'CommunitiesDirectoryComponent'],
    ['armadas', 'ArmadasDirectoryComponent'],
  ])('loads the right component for %s', async (path, expected) => {
    const loaded = await (
      childAt(path)?.loadComponent as () => Promise<{ name: string }>
    )();

    expect(loaded.name).toBe(expected);
  });
});
