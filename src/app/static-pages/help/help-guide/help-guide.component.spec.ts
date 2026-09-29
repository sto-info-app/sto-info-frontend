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
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { HelpFeaturesService } from '../help-features.service';
import { HELP_TOPICS } from '../help.data';
import { HelpFeatures, HelpTopic } from '../help.models';
import { ALL_HELP_FEATURES_ON, helpFeaturesWith } from '../help.testing';
import { HelpGuideComponent } from './help-guide.component';

describe('HelpGuideComponent', () => {
  let fixture: ComponentFixture<HelpGuideComponent>;
  let component: HelpGuideComponent;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let navigateSpy: jest.SpyInstance;
  let pageTitleSpy: { setTitle: jest.Mock };

  // The Storytime topic is the gated one, so it is what the visibility tests
  // need; the Community topic is always available and proves the other side.
  const storytimeTopic = HELP_TOPICS.find(
    topic => topic.requiresFeature === 'STORYTIME',
  ) as HelpTopic;
  const openTopic = HELP_TOPICS.find(
    topic => topic.requiresFeature === undefined,
  ) as HelpTopic;
  const firstGuide = storytimeTopic.guides[0];
  const secondGuide = storytimeTopic.guides[1];

  /**
   * Builds the page for one guide slug.
   *
   * @param slug The slug in the address.
   * @param storytimeAvailability Whether the Storytime feature is on, off, or
   *   could not be asked about at all.
   * @param permissions The permission codes the reader holds.
   * @param others Where the other switches stand, when not on.
   */
  const createComponent = (
    slug: string | null,
    storytimeAvailability: StorytimeAvailability = STORYTIME_AVAILABILITY_ENABLED,
    permissions: string[] = [],
    others: Partial<HelpFeatures> = {},
  ): void => {
    paramMap$ = new BehaviorSubject(
      convertToParamMap(slug === null ? {} : { guideSlug: slug }),
    );
    pageTitleSpy = { setTitle: jest.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpGuideComponent],
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
        {
          provide: AccessControlService,
          useValue: {
            getMyPermissions: () =>
              of(new Set<string>(permissions) as ReadonlySet<string>),
          },
        },
      ],
    });

    // Spied rather than replaced: the real Router still has to render the
    // links on the page, and only the redirect is being watched.
    navigateSpy = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(HelpGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /**
   * Reads the page's text.
   *
   * @returns Everything the page renders.
   */
  const pageText = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should create', () => {
    createComponent(firstGuide.slug);

    expect(component).toBeTruthy();
  });

  it('should show the guide named in the address', () => {
    createComponent(firstGuide.slug);

    expect(component.guide).toBe(firstGuide);
    expect(pageText()).toContain(firstGuide.title);
    expect(pageText()).toContain(firstGuide.summary);
  });

  it('should render every section of the guide', () => {
    createComponent(firstGuide.slug);

    firstGuide.sections.forEach(section => {
      expect(pageText()).toContain(section.heading);
      section.paragraphs.forEach(paragraph => {
        expect(pageText()).toContain(paragraph);
      });
      (section.points ?? []).forEach(point => {
        expect(pageText()).toContain(point);
      });
    });
  });

  // One route serves every guide, so route data cannot name the page and the
  // component has to.
  it('should set the page title from the guide', () => {
    createComponent(firstGuide.slug);

    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith(firstGuide.title);
  });

  it('should name the topic the guide belongs to', () => {
    createComponent(firstGuide.slug);

    expect(component.topicTitle).toBe(storytimeTopic.title);
    expect(pageText()).toContain(storytimeTopic.title);
  });

  // FC-048: the breadcrumb leads back to the guide's section as well as to
  // Help, so a reader can step back one level rather than start again.
  it('should lead back to the topic’s own page from the breadcrumb', () => {
    createComponent(firstGuide.slug);

    const crumbs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.help-guide__breadcrumb a',
      ),
    ).map(link => [link.getAttribute('href'), link.textContent?.trim()]);

    expect(crumbs).toEqual([
      ['/help', 'Help'],
      [`/help/topics/${storytimeTopic.id}`, storytimeTopic.title],
    ]);
  });

  it('should offer the other guides in the topic, but not this one', () => {
    createComponent(firstGuide.slug);

    const otherSlugs = component.otherGuides.map(guide => guide.slug);

    expect(otherSlugs).not.toContain(firstGuide.slug);
    expect(otherSlugs).toContain(secondGuide.slug);
  });

  it('should show a different guide when the address changes', () => {
    createComponent(firstGuide.slug);

    paramMap$.next(convertToParamMap({ guideSlug: secondGuide.slug }));
    fixture.detectChanges();

    expect(component.guide).toBe(secondGuide);
    expect(pageText()).toContain(secondGuide.title);
  });

  it('should give every section of the guide a bar the reader can collapse', () => {
    createComponent(firstGuide.slug);

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-collapsible-section',
    );

    // One per section, plus the list of other guides in the topic.
    expect(bars).toHaveLength(firstGuide.sections.length + 1);
  });

  it('should hide a section’s copy once its bar is collapsed', () => {
    createComponent(firstGuide.slug);

    const [firstSection] = firstGuide.sections;
    const firstToggle = (fixture.nativeElement as HTMLElement).querySelector(
      'app-collapsible-section button',
    ) as HTMLButtonElement;

    firstToggle.click();
    fixture.detectChanges();

    expect(pageText()).not.toContain(firstSection.paragraphs[0]);
    expect(pageText()).toContain(firstSection.heading);
  });

  it('should send a slug that names no guide to the not-found page', () => {
    createComponent('not-a-guide');

    expect(component.guide).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('should send an address with no slug at all to the not-found page', () => {
    createComponent(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
  });

  // A switch somebody turned off is not a wrong address, and a reader told
  // "page not found" has no reason to look again once it is back on.
  it('should say a Storytime guide is switched off rather than refuse it', () => {
    createComponent(firstGuide.slug, STORYTIME_AVAILABILITY_DISABLED);

    expect(component.guide).toBeNull();
    expect(component.unavailableReason).toBe('DISABLED');
    expect(component.topicLink).toBe('');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(pageText()).toContain('switched off at the moment');
  });

  // Only Storytime waits on a switch. A Community guide is help for a feature
  // that is always there, and refusing it would be a bug rather than caution.
  it('should still show a guide whose topic needs no feature switch', () => {
    const [communityGuide] = openTopic.guides;

    createComponent(communityGuide.slug, STORYTIME_AVAILABILITY_DISABLED);

    expect(component.guide).toBe(communityGuide);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // An outage is not a missing page either, and it is not the same thing as
  // the switch being off — so it gets its own wording on the same notice.
  it('should say the systems are not answering when the backend cannot be reached', () => {
    createComponent(firstGuide.slug, STORYTIME_AVAILABILITY_UNAVAILABLE);

    expect(component.guide).toBeNull();
    expect(component.unavailableReason).toBe('OFFLINE');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(pageText()).toContain('systems are not answering');
  });

  // Only the gated topic waits on the backend. A Community guide is words on a
  // page, and an outage is no reason to withhold it.
  it('should still show a guide whose topic needs no feature switch when the backend cannot be reached', () => {
    const [communityGuide] = openTopic.guides;

    createComponent(communityGuide.slug, STORYTIME_AVAILABILITY_UNAVAILABLE);

    expect(component.guide).toBe(communityGuide);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // The pages these guides describe are not something to advertise to
  // somebody who cannot open them, so the address is refused the way a
  // misspelt one is rather than with an explanation.
  it('should send a reader without the permission to the not-found page', () => {
    createComponent('moderating-storytime');

    expect(component.guide).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('should show the guide to a reader who holds the permission', () => {
    createComponent('moderating-storytime', STORYTIME_AVAILABILITY_ENABLED, [
      PERMISSIONS.STORYTIME_MODERATE,
    ]);

    expect(component.guide?.slug).toBe('moderating-storytime');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // A link at the foot to a guide this reader would be turned away from is a
  // link to the not-found page, offered by the page meant to help them.
  it('should offer no further guides the reader cannot open', () => {
    createComponent('moderating-storytime', STORYTIME_AVAILABILITY_ENABLED, [
      PERMISSIONS.STORYTIME_MODERATE,
    ]);

    expect(component.otherGuides).toEqual([]);
  });

  it('should offer the other guides a reader given both jobs may read', () => {
    createComponent('moderating-storytime', STORYTIME_AVAILABILITY_ENABLED, [
      PERMISSIONS.STORYTIME_MODERATE,
      PERMISSIONS.STORYTIME_TAG_MANAGE,
    ]);

    expect(component.otherGuides.map(guide => guide.slug)).toEqual([
      'managing-storytime-tags',
    ]);
  });

  it('should render nothing at all when there is no guide to show', () => {
    createComponent('not-a-guide');

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#help-guide-page'),
    ).toBeNull();
  });

  describe('getGuideLink', () => {
    it('should build the path to another guide', () => {
      createComponent(firstGuide.slug);

      expect(component.getGuideLink('a-guide')).toBe('/help/a-guide');
    });
  });

  describe('getRouteLink', () => {
    it('should build the path to a route', () => {
      createComponent(firstGuide.slug);

      expect(component.getRouteLink('contact')).toBe('/contact');
    });
  });

  // When permission loading fails, the page should still show with an empty
  // permission set so that guides requiring permissions are hidden, rather than
  // the whole page being blocked by a loading error.
  it('should continue loading when permission retrieval fails', () => {
    paramMap$ = new BehaviorSubject(
      convertToParamMap({ guideSlug: firstGuide.slug }),
    );
    pageTitleSpy = { setTitle: jest.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpGuideComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        { provide: PageTitleService, useValue: pageTitleSpy },
        {
          provide: HelpFeaturesService,
          useValue: { features: () => of(ALL_HELP_FEATURES_ON) },
        },
        {
          provide: AccessControlService,
          useValue: {
            getMyPermissions: () =>
              throwError(() => new Error('Permission check failed')),
          },
        },
      ],
    });

    navigateSpy = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(HelpGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.guide).toBe(firstGuide);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  describe('guides about Fleet Community and chat (FC-049)', () => {
    it('should say a Fleet guide is switched off rather than refuse it', () => {
      createComponent('fleet-settings', STORYTIME_AVAILABILITY_ENABLED, [], {
        FLEET: 'DISABLED',
        CHAT: 'DISABLED',
      });

      expect(component.guide).toBeNull();
      expect(component.sections).toEqual([]);
      expect(component.unavailableReason).toBe('DISABLED');
      expect(component.unavailableFeatureName).toBe('Fleet Community');
      expect(pageTitleSpy.setTitle).toHaveBeenCalledWith('Fleet Community');
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should say the systems are not answering when the switch cannot be read', () => {
      createComponent('fleet-settings', STORYTIME_AVAILABILITY_ENABLED, [], {
        FLEET: 'UNAVAILABLE',
      });

      expect(component.unavailableReason).toBe('OFFLINE');
    });

    // The page shows chat's controls only while chat is on, so the guide to
    // them keeps only its roster export part while chat is off.
    it('should leave out the parts about chat while chat is off', () => {
      createComponent('fleet-settings', STORYTIME_AVAILABILITY_ENABLED, [], {
        CHAT: 'DISABLED',
      });

      expect(component.sections.map(section => section.heading)).toEqual([
        'Read Fleet roster exports as',
      ]);
      expect(pageText()).not.toContain('Show when I am typing');
    });

    it('should show every part while chat is on', () => {
      createComponent('fleet-settings');

      expect(pageText()).toContain('Who can see when I am online');
      expect(pageText()).toContain('Show when I am typing');
    });

    // A guide about a feature that is on still offers only the other guides
    // a reader could open.
    it('should offer no guide about Fleet Community at the foot while it is off', () => {
      createComponent('your-settings', STORYTIME_AVAILABILITY_ENABLED, [], {
        FLEET: 'DISABLED',
        CHAT: 'DISABLED',
      });

      expect(component.otherGuides.map(guide => guide.slug)).toEqual([
        'privacy-mode',
        'staying-signed-in',
        'dates-and-times',
      ]);
      expect(pageText()).not.toContain('Roster exports keep their own zone');
    });
  });
});
