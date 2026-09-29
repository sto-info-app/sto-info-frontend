import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { NavigationEnd, provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, of } from 'rxjs';

import { routes } from 'src/app/app-routing.module';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';

import { HelpGuideComponent } from './help-guide/help-guide.component';
import { HelpFeaturesService } from './help-features.service';
import { ALL_HELP_FEATURES_ON } from './help.testing';
import helpGuideSlugs from './help-guide-slugs.json';
import { HelpTopicComponent } from './help-topic/help-topic.component';
import { HelpComponent } from './help.component';

/** Stands in for the not-found page. */
@Component({ standalone: true, template: 'Not found' })
class NotFoundStubComponent {}

/**
 * The application's own Help routes, resolved as the router resolves them
 * (FC-048): a section's page and a guide's page must never answer for each
 * other, every guide address from before FC-048 must still open its guide,
 * and going back must return the reader to where they were.
 */
describe('Help routing (FC-048)', () => {
  // Whether the reader is a site administrator (FC-050).
  let isAdmin = false;

  beforeEach(() => {
    isAdmin = false;
  });

  let harness: RouterTestingHarness;

  beforeEach(async () => {
    const helpRoutes: Routes = routes.filter(
      route =>
        route.path === APP_ROUTES.HELP ||
        route.path === APP_ROUTES.HELP_TOPIC ||
        route.path === APP_ROUTES.HELP_GUIDE,
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...helpRoutes,
          { path: APP_ROUTES.PAGE_NOT_FOUND, component: NotFoundStubComponent },
        ]),
        provideLocationMocks(),
        {
          provide: HelpFeaturesService,
          useValue: { features: () => of(ALL_HELP_FEATURES_ON) },
        },
        { provide: AuthService, useValue: { isAdmin: () => isAdmin } },
        {
          provide: AccessControlService,
          useValue: {
            getMyPermissions: () =>
              of(new Set<string>() as ReadonlySet<string>),
          },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('keeps the Help home, section and guide routes in the application', () => {
    expect(
      routes
        .map(route => route.path)
        .filter(path => path?.startsWith(APP_ROUTES.HELP)),
    ).toEqual([APP_ROUTES.HELP, APP_ROUTES.HELP_TOPIC, APP_ROUTES.HELP_GUIDE]);
  });

  it('opens the Help home, a section and a guide at their own addresses', async () => {
    expect(await harness.navigateByUrl('/help')).toBeInstanceOf(HelpComponent);
    expect(
      await harness.navigateByUrl('/help/topics/community'),
    ).toBeInstanceOf(HelpTopicComponent);
    expect(
      await harness.navigateByUrl('/help/the-galactic-personnel-registry'),
    ).toBeInstanceOf(HelpGuideComponent);
  });

  it('still opens every public guide at the address it had before FC-048', async () => {
    for (const slug of helpGuideSlugs.slugs) {
      const page = await harness.navigateByUrl(`/help/${slug}`);

      expect(page).toBeInstanceOf(HelpGuideComponent);
      expect((page as HelpGuideComponent).guide?.slug).toBe(slug);
    }
  });

  it('opens every public section at its address', async () => {
    for (const id of helpGuideSlugs.topics) {
      const page = await harness.navigateByUrl(`/help/topics/${id}`);

      expect(page).toBeInstanceOf(HelpTopicComponent);
      expect((page as HelpTopicComponent).topic?.id).toBe(id);
    }
  });

  // "topics" alone is a one-part address, so it is read as a guide's slug,
  // and no guide has it.
  it('reads /help/topics on its own as an unknown guide', async () => {
    await harness.navigateByUrl('/help/topics');

    expect(TestBed.inject(Location).path()).toBe('/page-not-found');
  });

  it('goes back from a guide to its section, and from there to Help', async () => {
    const location = TestBed.inject(Location);
    const router = TestBed.inject(Router);

    // An application starts listening to the browser's back and forward
    // buttons with its first navigation; a test has to ask.
    router.initialNavigation();

    /** Goes back, as the browser's button does, and waits for the page. */
    const back = async (): Promise<void> => {
      const arrived = firstValueFrom(
        router.events.pipe(filter(event => event instanceof NavigationEnd)),
      );

      location.back();
      await arrived;
      harness.detectChanges();
    };

    await harness.navigateByUrl('/help');
    await harness.navigateByUrl('/help/topics/community');
    await harness.navigateByUrl('/help/the-galactic-personnel-registry');

    await back();

    expect(location.path()).toBe('/help/topics/community');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(
      HelpTopicComponent,
    );

    await back();

    expect(location.path()).toBe('/help');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(
      HelpComponent,
    );
  });
});
