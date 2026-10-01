import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import {
  STORYTIME_AVAILABILITY_DISABLED,
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
  StorytimeAvailability,
} from 'src/app/models/storytime.models';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
} from 'src/app/shared/constants/feature-availability.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { HelpFeaturesService } from '../help-features.service';
import { HELP_TOPICS } from '../help.data';
import { HelpFeatures, HelpTopic } from '../help.models';
import { helpFeaturesWith } from '../help.testing';
import { HelpTopicComponent } from './help-topic.component';

describe('HelpTopicComponent (FC-048)', () => {
  // Whether the reader is a site administrator (FC-050).
  let isAdmin = false;

  beforeEach(() => {
    isAdmin = false;
  });

  let fixture: ComponentFixture<HelpTopicComponent>;
  let component: HelpTopicComponent;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let navigateSpy: jest.SpyInstance;
  let pageTitleSpy: { setTitle: jest.Mock };

  const byId = (id: string): HelpTopic =>
    HELP_TOPICS.find(topic => topic.id === id) as HelpTopic;
  const community = byId('community');
  const storytime = byId('storytime');
  const running = byId('storytime-admin');

  /**
   * Builds the page for one section.
   *
   * @param topicId The section in the address.
   * @param storytimeAvailability Whether Storytime is on, off, or could not
   *   be asked about.
   * @param permissions The permission codes the reader holds, or null when
   *   they could not be read.
   * @param others Where the other switches stand, when not on.
   */
  const createComponent = (
    topicId: string | null,
    storytimeAvailability: StorytimeAvailability = STORYTIME_AVAILABILITY_ENABLED,
    permissions: string[] | null = [],
    others: Partial<HelpFeatures> = {},
  ): void => {
    paramMap$ = new BehaviorSubject(
      convertToParamMap(topicId === null ? {} : { topicId }),
    );
    pageTitleSpy = { setTitle: jest.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpTopicComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        { provide: PageTitleService, useValue: pageTitleSpy },
        {
          provide: HelpFeaturesService,
          useValue: {
            features: () =>
              of(
                helpFeaturesWith({
                  STORYTIME: storytimeAvailability,
                  ...others,
                }),
              ),
          },
        },
        { provide: AuthService, useValue: { isAdmin: () => isAdmin } },
        {
          provide: AccessControlService,
          useValue: {
            getMyPermissions: () =>
              permissions === null
                ? throwError(() => new Error('offline'))
                : of(new Set<string>(permissions) as ReadonlySet<string>),
          },
        },
      ],
    });

    navigateSpy = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(HelpTopicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const pageText = (): string => page().textContent ?? '';
  const hrefs = (): (string | null)[] =>
    Array.from(page().querySelectorAll('a')).map(link =>
      link.getAttribute('href'),
    );

  it('shows the section named in the address, with every guide in it', () => {
    createComponent('community');

    expect(page().querySelector('h1')?.textContent).toBe(community.title);
    expect(pageText()).toContain(community.intro);
    community.guides.forEach(guide => {
      expect(pageText()).toContain(guide.title);
      expect(pageText()).toContain(guide.summary);
      expect(hrefs()).toContain(`/help/${guide.slug}`);
    });
    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith(community.title);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('leads back to Help, and offers a way to ask a question', () => {
    createComponent('community');

    const breadcrumb = page().querySelector('.help-guide__breadcrumb');

    expect(breadcrumb?.querySelector('a')?.getAttribute('href')).toBe('/help');
    expect(
      breadcrumb?.querySelector('[aria-current="page"]')?.textContent,
    ).toBe(community.title);
    expect(hrefs()).toContain('/contact');
  });

  it('re-renders in place when the address moves to another section', () => {
    createComponent('community');

    paramMap$.next(convertToParamMap({ topicId: 'storytime' }));
    fixture.detectChanges();

    expect(component.topic).toBe(storytime);
    expect(pageText()).toContain(storytime.guides[0].title);
  });

  it('sends an unknown section, or none, to the not-found page', () => {
    createComponent('no-such-section');

    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
    expect(component.topic).toBeNull();

    createComponent(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('offers only the guides the reader holds the permission for', () => {
    createComponent('storytime-admin', STORYTIME_AVAILABILITY_ENABLED, [
      PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
    ]);

    expect(component.guides.map(guide => guide.slug)).toEqual(
      running.guides
        .filter(
          guide =>
            guide.requiresPermission === PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        )
        .map(guide => guide.slug),
    );
    expect(pageText()).not.toContain('Working the moderation queue');
  });

  it('sends a section with nothing the reader may open to the not-found page', () => {
    createComponent('storytime-admin');

    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
    expect(pageText()).not.toContain(running.title);
  });

  it('keeps the public guides when permissions cannot be read', () => {
    createComponent('community', STORYTIME_AVAILABILITY_ENABLED, null);

    expect(component.guides).toEqual(community.guides);

    createComponent('storytime-admin', STORYTIME_AVAILABILITY_ENABLED, null);

    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
  });

  it.each<[StorytimeAvailability, string]>([
    [STORYTIME_AVAILABILITY_DISABLED, FEATURE_UNAVAILABLE_DISABLED],
    [STORYTIME_AVAILABILITY_UNAVAILABLE, FEATURE_UNAVAILABLE_OFFLINE],
  ])(
    'says why a Storytime section cannot be read while Storytime is %s',
    (availability, reason) => {
      createComponent('storytime', availability);

      expect(component.unavailableReason).toBe(reason);
      expect(component.topic).toBeNull();
      expect(component.guides).toEqual([]);
      expect(page().querySelector('app-feature-unavailable')).not.toBeNull();
      expect(pageText()).not.toContain(storytime.guides[0].title);
      expect(pageTitleSpy.setTitle).toHaveBeenCalledWith('Storytime');
      expect(hrefs()).toContain('/help');
      expect(navigateSpy).not.toHaveBeenCalled();
    },
  );

  it('shows the section again once Storytime is back', () => {
    createComponent('storytime', STORYTIME_AVAILABILITY_DISABLED);

    paramMap$.next(convertToParamMap({ topicId: 'community' }));
    fixture.detectChanges();

    expect(component.unavailableReason).toBeNull();
    expect(component.topic).toBe(community);
  });

  it('keeps sections that need no switch while Storytime is off', () => {
    createComponent('community', STORYTIME_AVAILABILITY_DISABLED);

    expect(component.topic).toBe(community);
    expect(component.unavailableReason).toBeNull();
  });

  // FC-050: a guide about Fleet Community stays in its section while it is
  // off, noted, so it can still be found.
  it('keeps the Fleet settings guide while Fleet Community is off, noted', () => {
    createComponent('settings', STORYTIME_AVAILABILITY_ENABLED, [], {
      FLEET: 'DISABLED',
      CHAT: 'DISABLED',
    });

    const index = component.guides.findIndex(
      guide => guide.slug === 'fleet-settings',
    );

    expect(index).toBeGreaterThan(-1);
    expect(component.switchedOff).toBeNull();
    expect(component.guideNotes[index]).toBe(
      'Fleet Community is switched off at the moment.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Fleet Community is switched off at the moment.',
    );
    expect(component.guideNotes.filter(note => note !== null)).toHaveLength(
      component.guides.filter(guide => guide.requiresFeature === 'FLEET')
        .length,
    );
  });

  // The whole section says so once; its chat guide adds nothing more.
  it('keeps the Fleets section while Fleet Community is off, noted once', () => {
    createComponent('fleets', STORYTIME_AVAILABILITY_ENABLED, [], {
      FLEET: 'DISABLED',
      CHAT: 'DISABLED',
    });

    expect(component.topic?.id).toBe('fleets');
    expect(component.switchedOff).toContain(
      'Fleet Community is switched off at the moment',
    );
    expect(component.guideNotes.every(note => note === null)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Its guides stay here');
  });

  it('notes nothing while every switch is on', () => {
    createComponent('settings');

    expect(component.switchedOff).toBeNull();
    expect(component.guideNotes.every(note => note === null)).toBe(true);
  });
});
