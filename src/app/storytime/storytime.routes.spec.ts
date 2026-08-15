import { Route } from '@angular/router';
import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { PermissionGuard } from 'src/app/core/auth/permission.guard';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeLandingComponent } from './landing/storytime-landing.component';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';
import { STORYTIME_ROUTES } from './storytime.routes';

describe('STORYTIME_ROUTES', () => {
  const parentRoute: Route = STORYTIME_ROUTES[0];
  const children = parentRoute.children ?? [];

  /**
   * Finds a child route by path.
   *
   * @param path - The path to find.
   * @returns The route.
   */
  const childAt = (path: string): Route | undefined =>
    children.find(child => child.path === path);

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
    const landing = childAt('');

    expect(landing?.component).toBe(StorytimeLandingComponent);
    expect(landing?.data?.['title']).toBe(APP_ROUTE_TITLES.STORYTIME);
  });

  it('lazily loads every page other than the landing', () => {
    const lazy = children.filter(child => child.path !== '');

    expect(lazy.length).toBeGreaterThan(0);
    expect(lazy.every(child => typeof child.loadComponent === 'function')).toBe(
      true,
    );
  });

  // Actually resolving each import proves the paths are right. A typo in a
  // lazy import is invisible until somebody navigates to that route.
  it('resolves every lazily loaded component', async () => {
    const lazy = children.filter(child => child.loadComponent !== undefined);

    for (const route of lazy) {
      const loader = route.loadComponent as () => Promise<unknown>;
      await expect(loader()).resolves.toBeDefined();
    }
  });

  describe('creator routes', () => {
    const creatorPaths = [
      'manage/stories',
      'manage/stories/new',
      'manage/stories/:storyId',
    ];

    it.each(creatorPaths)('requires sign-in and a permission for %s', path => {
      const route = childAt(path);

      expect(route?.canActivate).toEqual([AuthGuard, PermissionGuard]);
      expect(route?.data?.['permission']).toBeDefined();
    });

    it('requires the create permission to start a new Story', () => {
      expect(childAt('manage/stories/new')?.data?.['permission']).toBe(
        PERMISSIONS.STORYTIME_STORY_CREATE,
      );
    });

    it('requires the edit permission to change one', () => {
      expect(childAt('manage/stories/:storyId')?.data?.['permission']).toBe(
        PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
      );
    });

    // Declaring the creator routes first is what stops `stories/new` being
    // read as a Story slug.
    it('declares the creator routes before the public Story route', () => {
      const managePosition = children.findIndex(child =>
        child.path?.startsWith('manage/'),
      );
      const storyPosition = children.findIndex(
        child => child.path === 'stories/:storySlug',
      );

      expect(managePosition).toBeLessThan(storyPosition);
    });
  });

  describe('public routes', () => {
    it('lists Stories without requiring sign-in', () => {
      expect(childAt('stories')?.canActivate).toBeUndefined();
    });

    it('reads a Story without requiring sign-in', () => {
      expect(childAt('stories/:storySlug')?.canActivate).toBeUndefined();
    });
  });
});
