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

  // The library is a reader's own progress, so it needs sign-in — but not a
  // creator permission, which would shut out every reader who does not write.
  it('requires sign-in for the reader library, and nothing more', () => {
    const library = childAt('library');

    expect(library?.canActivate).toEqual([AuthGuard]);
    expect(library?.data?.['permission']).toBeUndefined();
    expect(library?.data?.['title']).toBe(APP_ROUTE_TITLES.STORYTIME_LIBRARY);
  });

  // A Character's page is reached through its Story, exactly as a Chapter is,
  // and needs no account: the Story being readable is the only gate.
  it('reads a Character through its Story, without sign-in', () => {
    const character = childAt('stories/:storySlug/characters/:characterSlug');

    expect(character).toBeDefined();
    expect(character?.canActivate).toBeUndefined();
    expect(character?.data?.['title']).toBe(
      APP_ROUTE_TITLES.STORYTIME_CHARACTER,
    );
  });

  // Answering an invitation is how somebody who does not yet write becomes
  // able to, so requiring a creator permission would lock them out of the one
  // page that would grant it.
  it('needs sign-in but no creator permission to answer an invitation', () => {
    const invitations = childAt('manage/invitations');

    expect(invitations?.canActivate).toEqual([AuthGuard]);
    expect(invitations?.data?.['permission']).toBeUndefined();
  });

  describe('creator routes', () => {
    const creatorPaths = [
      'manage/stories',
      'manage/stories/new',
      'manage/stories/:storyId',
      'manage/stories/:storyId/chapters',
      'manage/stories/:storyId/chapters/new',
      'manage/chapters/:chapterId',
      'manage/stories/:storyId/characters',
      'manage/stories/:storyId/characters/new',
      'manage/characters/:characterId',
      'manage/stories/:storyId/collaborators',
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

    // A new Chapter must not be read as an existing Chapter id.
    it('declares the new-Chapter route before the Chapter editor', () => {
      const newPosition = children.findIndex(
        child => child.path === 'manage/stories/:storyId/chapters/new',
      );
      const editPosition = children.findIndex(
        child => child.path === 'manage/chapters/:chapterId',
      );

      expect(newPosition).toBeLessThan(editPosition);
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

  // An Arc is a reading order over other people's Stories, not a claim on any
  // of them, so a reader who never writes may still curate one.
  describe('curator routes', () => {
    const curatorPaths = [
      'manage/arcs',
      'manage/arcs/new',
      'manage/arcs/:arcId',
      'manage/arcs/:arcId/stories',
      'manage/arcs/:arcId/collaborators',
    ];

    it.each(curatorPaths)(
      'requires sign-in but no creator permission for %s',
      path => {
        const route = childAt(path);

        expect(route?.canActivate).toEqual([AuthGuard]);
        expect(route?.data?.['permission']).toBeUndefined();
      },
    );

    it.each(curatorPaths)('names %s in the browser title', path => {
      expect(childAt(path)?.data?.['title']).toBeDefined();
    });

    // `manage/arcs` must not be read as an Arc slug.
    it('declares the curator routes before the public Arc route', () => {
      const managePosition = children.findIndex(
        child => child.path === 'manage/arcs',
      );
      const arcPosition = children.findIndex(
        child => child.path === 'arcs/:arcSlug',
      );

      expect(managePosition).toBeLessThan(arcPosition);
    });

    // A new Arc must not be read as an existing Arc id.
    it('declares the new-Arc route before the Arc editor', () => {
      const newPosition = children.findIndex(
        child => child.path === 'manage/arcs/new',
      );
      const editPosition = children.findIndex(
        child => child.path === 'manage/arcs/:arcId',
      );

      expect(newPosition).toBeLessThan(editPosition);
    });
  });

  // Choosing what the site features is a job somebody can be given without
  // being handed the rest of the site with it, so these sit behind the
  // Spotlight permission rather than the ADMIN role.
  describe('editorial routes', () => {
    const editorialPaths = [
      'manage/spotlight',
      'manage/spotlight/new',
      'manage/spotlight/:spotlightId',
    ];

    it.each(editorialPaths)(
      'requires sign-in and the Spotlight permission for %s',
      path => {
        const route = childAt(path);

        expect(route?.canActivate).toEqual([AuthGuard, PermissionGuard]);
        expect(route?.data?.['permission']).toBe(
          PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        );
      },
    );

    // `manage/spotlight` must not be read as a selection slug, and `new` must
    // not be read as an existing entry.
    it.each([
      ['manage/spotlight', 'spotlight'],
      ['manage/spotlight/new', 'manage/spotlight/:spotlightId'],
    ])('declares %s before %s', (first, second) => {
      expect(children.findIndex(child => child.path === first)).toBeLessThan(
        children.findIndex(child => child.path === second),
      );
    });

    // The Spotlight is the site's shop window; requiring an account to see it
    // would defeat the point of having one.
    it('reads the Spotlight without sign-in', () => {
      const spotlight = childAt('spotlight');

      expect(spotlight?.canActivate).toBeUndefined();
      expect(spotlight?.data?.['title']).toBe(
        APP_ROUTE_TITLES.STORYTIME_SPOTLIGHT,
      );
    });
  });

  describe('the rules, readable by anybody', () => {
    // A reader deciding whether to report something, and a creator deciding
    // whether to publish, both need the rules before they have an account.
    it.each(['content-policy', 'removed'])('reads %s without sign-in', path => {
      const route = childAt(path);

      expect(route?.canActivate).toBeUndefined();
      expect(route?.data?.['title']).toBeDefined();
    });
  });

  describe('public routes', () => {
    it('lists Stories without requiring sign-in', () => {
      expect(childAt('stories')?.canActivate).toBeUndefined();
    });

    it('reads a Story without requiring sign-in', () => {
      expect(childAt('stories/:storySlug')?.canActivate).toBeUndefined();
    });

    it('reads a Chapter without requiring sign-in', () => {
      expect(
        childAt('stories/:storySlug/chapters/:chapterSlug')?.canActivate,
      ).toBeUndefined();
    });
  });
});
