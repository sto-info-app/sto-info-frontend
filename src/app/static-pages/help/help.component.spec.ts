import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { HelpComponent } from './help.component';
import { HELP_TOPICS, visibleHelpTopics } from './help.data';
import { HelpTopic } from './help.models';

describe('HelpComponent', () => {
  let fixture: ComponentFixture<HelpComponent>;
  let component: HelpComponent;

  /**
   * Builds the page with Storytime switched on or off.
   *
   * @param isStorytimeOffered Whether the Storytime feature is available.
   * @param permissions The permission codes the reader holds.
   */
  const createComponent = (
    isStorytimeOffered: boolean,
    permissions: string[] = [],
  ): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpComponent],
      providers: [
        provideRouter([]),
        {
          provide: StorytimeService,
          useValue: { isOffered: () => of(isStorytimeOffered) },
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

    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /**
   * The topics a reader in that position should be offered.
   *
   * @param isStorytimeOffered Whether the Storytime feature is available.
   * @param permissions The permission codes the reader holds.
   * @returns The topics expected on the page.
   */
  const expectedTopics = (
    isStorytimeOffered: boolean,
    permissions: string[] = [],
  ): HelpTopic[] =>
    visibleHelpTopics(isStorytimeOffered, new Set<string>(permissions));

  /**
   * Reads the page's text.
   *
   * @returns Everything the page renders.
   */
  const pageText = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should create', () => {
    createComponent(true);

    expect(component).toBeTruthy();
  });

  /**
   * Reads each section tile: where it leads, its title, its count and its
   * summary.
   *
   * @returns One entry per tile, in order.
   */
  const tiles = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.help-tile-grid > li',
      ),
    ).map(tile => ({
      href: tile.querySelector('a')?.getAttribute('href'),
      title: tile.querySelector('h2')?.textContent?.trim(),
      count: tile.querySelector('.help-panel-card__count')?.textContent?.trim(),
      summary: tile
        .querySelector('.help-panel-card__summary')
        ?.textContent?.trim(),
    }));

  // FC-048: one tile per section on offer, each leading to that section's
  // own page, with the section's introduction as its summary.
  it('should offer one tile for every section on offer, leading to its page', () => {
    createComponent(true);

    expect(tiles()).toEqual(
      expectedTopics(true).map(topic => ({
        href: `/help/topics/${topic.id}`,
        title: topic.title,
        count: `${topic.guides.length} guides`,
        summary: topic.intro,
      })),
    );
  });

  // Steve's decision: the Help home is tiles only; the guides are listed on
  // each section's page.
  it('should list no guide on the Help home itself', () => {
    createComponent(true);

    HELP_TOPICS.flatMap(topic => topic.guides).forEach(guide => {
      expect(pageText()).not.toContain(guide.title);
    });
  });

  // The count is of what this reader may open, so a tile never promises a
  // guide the section's page will not show them.
  it('should count only the guides the reader may open, in words', () => {
    createComponent(true, [PERMISSIONS.STORYTIME_MODERATE]);

    expect(tiles().at(-1)).toEqual(
      expect.objectContaining({
        href: '/help/topics/storytime-admin',
        count: '1 guide',
      }),
    );
  });

  // While Storytime is off it is meant to look like a feature that does not
  // exist, so a page of guides explaining it would give the game away.
  it('should hide the Storytime guides while the feature is switched off', () => {
    createComponent(false);

    expect(pageText()).not.toContain('STO Storytime');
  });

  // Everything that does not wait on a feature switch is still help, and a
  // reader with Storytime off has not stopped needing it.
  it('should keep the topics that need no feature switch', () => {
    createComponent(false);

    const alwaysAvailable = HELP_TOPICS.filter(
      topic => topic.requiresFeature !== 'STORYTIME',
    );

    expect(component.topics).toEqual(alwaysAvailable);
    alwaysAvailable.forEach(topic => {
      expect(pageText()).toContain(topic.title);
    });
  });

  // The guides for running Storytime describe pages their reader would be
  // turned away from unless they have been given the job. Offering them to
  // everybody would be a list of doors nobody else can open.
  it('should hide the guides for running Storytime from a reader given none of it', () => {
    createComponent(true);

    expect(component.topics.map(topic => topic.id)).not.toContain(
      'storytime-admin',
    );
    expect(pageText()).not.toContain('Running Storytime');
  });

  /**
   * The guides offered under one section.
   *
   * @param id The section's id.
   * @returns Their titles.
   */
  const guideTitlesIn = (id: string): string[] =>
    component.topics
      .find(topic => topic.id === id)
      ?.guides.map(guide => guide.title) ?? [];

  it('should offer a moderator the guide to the queue', () => {
    createComponent(true, [PERMISSIONS.STORYTIME_MODERATE]);

    expect(pageText()).toContain('Running Storytime');
    expect(guideTitlesIn('storytime-admin')).toEqual([
      'Working the moderation queue',
    ]);
  });

  // The three jobs are handed out one at a time, so holding one of them
  // offers one guide rather than the set.
  it('should offer only the guide for the job the reader was given', () => {
    createComponent(true, [PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE]);

    expect(guideTitlesIn('storytime-admin')).toEqual([
      'Curating the Spotlight',
    ]);
  });

  // Storytime being off takes its guides with it, whoever is reading.
  it('should hide the guides for running Storytime while the feature is off', () => {
    createComponent(false, [PERMISSIONS.STORYTIME_MODERATE]);

    expect(pageText()).not.toContain('Running Storytime');
  });

  // Help is the wrong page to answer with an apology. A permission lookup
  // that fails costs the reader the guides almost nobody wants, not the rest.
  it('should still show the public guides when permissions cannot be read', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpComponent],
      providers: [
        provideRouter([]),
        {
          provide: HelpFeaturesService,
          useValue: { features: () => of(ALL_HELP_FEATURES_ON) },
        },
        {
          provide: AccessControlService,
          useValue: {
            getMyPermissions: () => throwError(() => new Error('offline')),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.topics.map(topic => topic.id)).toEqual([
      'community',
      'custom-tracking',
      'storytime',
    ]);
  });

  // The page is never empty of everything: whatever is filtered out, the
  // heading, the introduction and the way to ask a question remain.
  it('should still offer a way to ask a question with a topic filtered out', () => {
    createComponent(false);

    expect(pageText()).toContain('Still stuck?');
  });

  // Each tile is headed one level below the page, so a screen reader's list
  // of headings reads as the list of sections.
  it('should head each tile one level below the page', () => {
    createComponent(true);

    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('h1, h2'),
    ).map(heading => heading.tagName);

    // One per tile, then "Still stuck?".
    expect(headings).toEqual([
      'H1',
      ...expectedTopics(true).map(() => 'H2'),
      'H2',
    ]);
  });

  // Somebody the guides did not help needs the way out to be on the page.
  it('should offer a way to ask a question', () => {
    createComponent(true);

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => link.getAttribute('href'));

    expect(links).toContain('/contact');
  });

  describe('getTopicLink', () => {
    it('should build the path to a section', () => {
      createComponent(true);

      expect(component.getTopicLink('a-section')).toBe(
        '/help/topics/a-section',
      );
    });
  });

  describe('getRouteLink', () => {
    it('should build the path to a route', () => {
      createComponent(true);

      expect(component.getRouteLink('contact')).toBe('/contact');
    });
  });
});
