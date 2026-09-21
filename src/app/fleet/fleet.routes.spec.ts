import { Route } from '@angular/router';

import { AuthGuard } from 'src/app/core/auth/auth.guard';
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

  it('declares one parent holding the listings and the scope pages', () => {
    expect(FLEET_ROUTES).toHaveLength(1);
    expect(parentRoute.path).toBe('');
    expect(children).toHaveLength(9);
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

  // Registering needs an account, and a literal segment can never be a
  // Community slug: a scope's address always names its collection first.
  it.each([
    ['register', APP_ROUTE_TITLES.FLEET_REGISTER],
    [
      'communities/:communitySlug/fleets/register',
      APP_ROUTE_TITLES.FLEET_REGISTER_FLEET,
    ],
    [
      'communities/:communitySlug/armadas/register',
      APP_ROUTE_TITLES.FLEET_REGISTER_ARMADA,
    ],
  ])('puts %s behind the sign-in guard', (path, title) => {
    expect(childAt(path)?.canActivate).toEqual([AuthGuard]);
    expect(childAt(path)?.data?.['title']).toBe(title);
  });

  /**
   * `register` is a literal where the deeper routes have a platform
   * segment — four segments against five — so neither can claim the
   * other's address whatever order they are declared in.
   */
  it('registers into a Community inside the collection it adds to', () => {
    const paths = children.map(child => child.path);

    expect(paths).toContain('communities/:communitySlug/fleets/register');
    expect(paths).toContain('communities/:communitySlug/armadas/register');
  });

  it('loads each listing only when its address is reached', () => {
    expect(
      children.every(child => typeof child.loadComponent === 'function'),
    ).toBe(true);
  });

  // A Community's canonical address spells out the collection it belongs
  // to, which is what keeps a Community slug from ever being mistaken for a
  // page of the directory's own, however the directory grows.
  it.each([
    ['communities/:communitySlug', APP_ROUTE_TITLES.FLEET_COMMUNITY],
    [
      'communities/:communitySlug/fleets/:platformSegment/:slug',
      APP_ROUTE_TITLES.FLEET_SCOPE_FLEET,
    ],
    [
      'communities/:communitySlug/armadas/:platformSegment/:slug',
      APP_ROUTE_TITLES.FLEET_SCOPE_ARMADA,
    ],
  ])('addresses a scope at %s', (path, title) => {
    expect(childAt(path)?.data?.['title']).toBe(title);
  });

  /**
   * A Community's own page is declared last of the three, so
   * `communities/x/fleets/pc/y` is never read as a Community called `x`
   * with three segments of nonsense after it.
   */
  it('matches the deeper scope addresses before the Community’s own', () => {
    const paths = children.map(child => child.path);

    expect(paths.indexOf('communities/:communitySlug')).toBeGreaterThan(
      paths.indexOf('communities/:communitySlug/fleets/:platformSegment/:slug'),
    );
    expect(paths.indexOf('communities/:communitySlug')).toBeGreaterThan(
      paths.indexOf(
        'communities/:communitySlug/armadas/:platformSegment/:slug',
      ),
    );
  });

  it.each([
    ['', 'FleetsDirectoryComponent'],
    ['communities', 'CommunitiesDirectoryComponent'],
    ['armadas', 'ArmadasDirectoryComponent'],
    ['register', 'CommunityRegisterComponent'],
    ['communities/:communitySlug/fleets/register', 'FleetRegisterComponent'],
    ['communities/:communitySlug/armadas/register', 'ArmadaRegisterComponent'],
    ['communities/:communitySlug', 'CommunityPageComponent'],
    [
      'communities/:communitySlug/fleets/:platformSegment/:slug',
      'FleetPageComponent',
    ],
    [
      'communities/:communitySlug/armadas/:platformSegment/:slug',
      'ArmadaPageComponent',
    ],
  ])('loads the right component for %s', async (path, expected) => {
    const loaded = await (
      childAt(path)?.loadComponent as () => Promise<{ name: string }>
    )();

    expect(loaded.name).toBe(expected);
  });
});
