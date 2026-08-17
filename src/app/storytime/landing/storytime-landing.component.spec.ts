import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  Spotlight,
  SpotlightEntityType,
  StorySort,
  STORYTIME_DISABLED_STATE,
} from 'src/app/models/storytime.models';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FollowService } from '../follow.service';
import { SpotlightService } from '../spotlight.service';
import { StoryService } from '../story.service';
import { STORYTIME_COPY } from '../storytime.constants';
import { StorytimeService } from '../storytime.service';
import { StorytimeLandingComponent } from './storytime-landing.component';

describe('StorytimeLandingComponent', () => {
  let fixture: ComponentFixture<StorytimeLandingComponent>;
  let spotlightService: { getSpotlight: jest.Mock };
  let storytimeService: { getFeatureState: jest.Mock };
  let storyService: { getStories: jest.Mock };
  let followService: { getUnreadCount: jest.Mock };
  let authService: { isLoggedIn: jest.Mock };

  /**
   * Builds a Spotlight selection.
   *
   * @param overrides - Fields to change.
   * @returns The selection.
   */
  const buildEntry = (overrides: Partial<Spotlight> = {}): Spotlight =>
    ({
      id: 'spotlight-1',
      slug: 'a-fine-story',
      entityType: SpotlightEntityType.STORY,
      headline: 'Start here',
      summary: 'Worth your evening.',
      selectionReason: null,
      overrideImageUrl: null,
      overrideImageMobileUrl: null,
      overrideImageAlt: null,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: null,
      story: {
        id: 'story-1',
        slug: 'a-fine-story',
        title: 'A Fine Story',
        bannerImageUrl: null,
        bannerImageAlt: null,
      },
      arc: null,
      ...overrides,
    }) as Spotlight;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StorytimeLandingComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    spotlightService = {
      getSpotlight: jest.fn().mockReturnValue(of([buildEntry()])),
    };
    storytimeService = {
      getFeatureState: jest.fn().mockReturnValue(
        of({
          ...STORYTIME_DISABLED_STATE,
          isEnabled: true,
          spotlightEnabled: true,
        }),
      ),
    };

    // Signed in by default, so the reader's own corner of the page is there
    // to be asserted about; the signed-out case is its own test.
    authService = { isLoggedIn: jest.fn().mockReturnValue(true) };
    followService = {
      getUnreadCount: jest.fn().mockReturnValue(of({ unread: 3 })),
    };

    storyService = {
      getStories: jest.fn().mockReturnValue(
        of({
          items: [
            {
              id: 'story-1',
              slug: 'a-story',
              title: 'A Story',
              shortDescription: 'Where it begins.',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 6,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [StorytimeLandingComponent],
      providers: [
        provideRouter([]),
        { provide: SpotlightService, useValue: spotlightService },
        { provide: StoryService, useValue: storyService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: FollowService, useValue: followService },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('is created', () => {
    render();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the feature title and introduction', () => {
    const text = render().textContent ?? '';

    expect(text).toContain(STORYTIME_COPY.LANDING_TITLE);
    expect(text).toContain(STORYTIME_COPY.LANDING_INTRO);
  });

  // Required wherever fan-created Star Trek content is published.
  it('shows the fan content notice', () => {
    const text = render().textContent ?? '';

    expect(text).toContain(STORYTIME_COPY.FAN_CONTENT_NOTICE);
  });

  describe('the Spotlight', () => {
    it('leads with what has been chosen', () => {
      const text = render().textContent ?? '';

      expect(text).toContain('Start here');
      expect(text).toContain('A Fine Story');
      expect(text).toContain('Worth your evening.');
    });

    it('sends a reader to the featured Story', () => {
      const link = render().querySelector('.storytime-spotlight__headline a');

      expect(link?.getAttribute('href')).toContain('stories/a-fine-story');
    });

    it('sends a reader to the featured Arc', () => {
      spotlightService.getSpotlight.mockReturnValue(
        of([
          buildEntry({
            entityType: SpotlightEntityType.ARC,
            story: null,
            arc: {
              id: 'arc-1',
              slug: 'the-long-war',
              title: 'The Long War',
            } as never,
          }),
        ]),
      );

      const link = render().querySelector('.storytime-spotlight__headline a');

      expect(link?.getAttribute('href')).toContain('arcs/the-long-war');
    });

    it('shows why the work was chosen when an editor said', () => {
      spotlightService.getSpotlight.mockReturnValue(
        of([buildEntry({ selectionReason: 'It stayed with us.' })]),
      );

      expect(render().textContent).toContain('It stayed with us.');
    });

    // The editor's override wins; otherwise the work's own banner, which is
    // what a reader sees when they arrive.
    it('prefers the override image to the work’s banner', () => {
      spotlightService.getSpotlight.mockReturnValue(
        of([
          buildEntry({
            overrideImageUrl: 'https://cdn.test/override',
            overrideImageAlt: 'A fleet',
          }),
        ]),
      );

      const image = render().querySelector('.storytime-spotlight__image');

      expect(image?.getAttribute('src')).toBe('https://cdn.test/override');
      expect(image?.getAttribute('alt')).toBe('A fleet');
    });

    it('falls back to the work’s own banner', () => {
      spotlightService.getSpotlight.mockReturnValue(
        of([
          buildEntry({
            story: {
              slug: 'a-fine-story',
              title: 'A Fine Story',
              bannerImageUrl: 'https://cdn.test/banner',
              bannerImageAlt: 'A ship',
            } as never,
          }),
        ]),
      );

      const image = render().querySelector('.storytime-spotlight__image');

      expect(image?.getAttribute('src')).toBe('https://cdn.test/banner');
      expect(image?.getAttribute('alt')).toBe('A ship');
    });

    it('shows no image when neither has one', () => {
      expect(render().querySelector('.storytime-spotlight__image')).toBeNull();
    });

    it('treats an image with no description as decorative', () => {
      spotlightService.getSpotlight.mockReturnValue(
        of([buildEntry({ overrideImageUrl: 'https://cdn.test/override' })]),
      );

      expect(
        render()
          .querySelector('.storytime-spotlight__image')
          ?.getAttribute('alt'),
      ).toBe('');
    });

    it('offers the archive', () => {
      expect(render().textContent).toContain('Past Spotlight selections');
    });

    it('shows no Spotlight when nothing is chosen', () => {
      spotlightService.getSpotlight.mockReturnValue(of([]));

      const element = render();

      expect(element.querySelector('.storytime-spotlight')).toBeNull();
      expect(element.textContent).not.toContain('Past Spotlight selections');
    });

    // Asking for something the environment has switched off would only be a
    // refusal.
    it('asks for nothing when the Spotlight is switched off', () => {
      storytimeService.getFeatureState.mockReturnValue(
        of({ ...STORYTIME_DISABLED_STATE, isEnabled: true }),
      );

      const element = render();

      expect(spotlightService.getSpotlight).not.toHaveBeenCalled();
      expect(element.querySelector('.storytime-spotlight')).toBeNull();
    });

    // The Spotlight is the best of the page, not the whole of it.
    it('still shows the page when the Spotlight cannot be loaded', () => {
      spotlightService.getSpotlight.mockReturnValue(
        throwError(() => new Error('unavailable')),
      );

      const text = render().textContent ?? '';

      expect(text).toContain(STORYTIME_COPY.LANDING_TITLE);
      expect(fixture.componentInstance.spotlight).toEqual([]);
    });
  });

  // Two different questions: what is new to read, and what is being written
  // now. One "recent" list would serve neither reader.
  describe('the Story lists', () => {
    it('asks for both orderings', () => {
      render();

      expect(storyService.getStories).toHaveBeenCalledWith(
        expect.objectContaining({ sort: StorySort.RECENTLY_PUBLISHED }),
      );
      expect(storyService.getStories).toHaveBeenCalledWith(
        expect.objectContaining({ sort: StorySort.RECENTLY_UPDATED }),
      );
    });

    it('shows what has just been published', () => {
      const element = render();

      expect(element.textContent).toContain('New Stories');
      expect(element.textContent).toContain('A Story');
      expect(element.textContent).toContain('Where it begins.');
    });

    it('shows what has just been updated', () => {
      const element = render();

      expect(element.textContent).toContain('Recently Updated');
    });

    it('offers search', () => {
      const element = render();

      expect(element.textContent).toContain('Search Storytime');
    });

    it('falls back to the empty message when nothing is published', () => {
      storyService.getStories.mockReturnValue(
        of({ items: [], total: 0, page: 1, pageSize: 6 }),
      );

      const element = render();

      expect(element.textContent).toContain(STORYTIME_COPY.LANDING_EMPTY);
      expect(element.textContent).not.toContain('Recently Updated');
    });

    // A landing page missing a list is a smaller failure than one replaced by
    // an apology.
    it('still shows the page when the lists cannot be loaded', () => {
      storyService.getStories.mockReturnValue(
        throwError(() => new Error('unavailable')),
      );

      const element = render();

      expect(element.textContent).toContain(STORYTIME_COPY.LANDING_TITLE);
      expect(fixture.componentInstance.newest).toEqual([]);
      expect(fixture.componentInstance.updated).toEqual([]);
    });
  });

  describe('the reader’s own corner of the page', () => {
    it('links to the feed, the reading lists and the library', () => {
      const element = render();
      const links = [
        ...element.querySelectorAll('.storytime-landing__yours a'),
      ].map(a => a.getAttribute('href'));

      expect(links).toEqual([
        '/storytime/feed',
        '/storytime/reading-lists',
        '/storytime/library',
      ]);
    });

    it('says how much of the feed is new', () => {
      const element = render();

      expect(
        element.querySelector('.storytime-landing__unread')?.textContent,
      ).toContain('3 new');
    });

    it('says nothing when the feed holds nothing new', () => {
      followService.getUnreadCount.mockReturnValue(of({ unread: 0 }));

      const element = render();

      expect(element.querySelector('.storytime-landing__unread')).toBeNull();
    });

    // An unread badge is a convenience, and a landing page that apologises for
    // not having one is worse than a landing page without one.
    it('shows the page even when the count cannot be read', () => {
      followService.getUnreadCount.mockReturnValue(
        throwError(() => new Error('nope')),
      );

      const element = render();

      expect(element.querySelector('.storytime-landing__unread')).toBeNull();
      expect(element.querySelector('.storytime-landing__yours')).not.toBeNull();
    });

    // A feed and a reading list only exist for somebody with an account.
    it('shows nothing of the kind to a signed-out reader', () => {
      authService.isLoggedIn.mockReturnValue(false);

      const element = render();

      expect(element.querySelector('.storytime-landing__yours')).toBeNull();
      expect(followService.getUnreadCount).not.toHaveBeenCalled();
    });
  });
});
