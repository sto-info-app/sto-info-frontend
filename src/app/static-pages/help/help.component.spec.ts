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
   * @param isStorytimeEnabled Whether the Storytime feature is available.
   * @param permissions The permission codes the reader holds.
   */
  const createComponent = (
    isStorytimeEnabled: boolean,
    permissions: string[] = [],
  ): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpComponent],
      providers: [
        provideRouter([]),
        {
          provide: StorytimeService,
          useValue: { isEnabled: () => of(isStorytimeEnabled) },
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
   * @param isStorytimeEnabled Whether the Storytime feature is available.
   * @param permissions The permission codes the reader holds.
   * @returns The topics expected on the page.
   */
  const expectedTopics = (
    isStorytimeEnabled: boolean,
    permissions: string[] = [],
  ): HelpTopic[] =>
    visibleHelpTopics(isStorytimeEnabled, new Set<string>(permissions));

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

  it('should list every guide in an available topic', () => {
    createComponent(true);

    expectedTopics(true).forEach(topic => {
      expect(pageText()).toContain(topic.title);
      topic.guides.forEach(guide => {
        expect(pageText()).toContain(guide.title);
      });
    });
  });

  it('should link each guide to its own page', () => {
    createComponent(true);

    const [guide] = HELP_TOPICS[0].guides;
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => link.getAttribute('href'));

    expect(links).toContain(`/help/${guide.slug}`);
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
      topic => !topic.requiresStorytime,
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

  it('should offer a moderator the guide to the queue', () => {
    createComponent(true, [PERMISSIONS.STORYTIME_MODERATE]);

    expect(pageText()).toContain('Running Storytime');
    expect(pageText()).toContain('Working the moderation queue');
  });

  // The three jobs are handed out one at a time, so holding one of them shows
  // one guide rather than the set.
  it('should offer only the guide for the job the reader was given', () => {
    createComponent(true, [PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE]);

    expect(pageText()).toContain('Curating the Spotlight');
    expect(pageText()).not.toContain('Working the moderation queue');
    expect(pageText()).not.toContain('Looking after the tag list');
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
          provide: StorytimeService,
          useValue: { isEnabled: () => of(true) },
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
      'storytime',
    ]);
  });

  // The page is never empty of everything: whatever is filtered out, the
  // heading, the introduction and the way to ask a question remain.
  it('should still offer a way to ask a question with a topic filtered out', () => {
    createComponent(false);

    expect(pageText()).toContain('Still stuck?');
  });

  // Every topic is long enough to be worth folding away, so each one gets its
  // own bar rather than the page having a single toggle.
  it('should give every topic a heading bar the reader can collapse', () => {
    createComponent(true);

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-collapsible-section',
    );

    // One per topic shown, plus the "Still stuck?" section.
    expect(bars).toHaveLength(expectedTopics(true).length + 1);
  });

  it('should hide a topic’s guides once its bar is collapsed', () => {
    createComponent(true);

    const [guide] = HELP_TOPICS[0].guides;
    const firstToggle = (fixture.nativeElement as HTMLElement).querySelector(
      'app-collapsible-section button',
    ) as HTMLButtonElement;

    firstToggle.click();
    fixture.detectChanges();

    expect(pageText()).not.toContain(guide.title);
    expect(pageText()).toContain(HELP_TOPICS[0].title);
  });

  // Somebody the guides did not help needs the way out to be on the page.
  it('should offer a way to ask a question', () => {
    createComponent(true);

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => link.getAttribute('href'));

    expect(links).toContain('/contact');
  });

  describe('getGuideLink', () => {
    it('should build the path to a guide', () => {
      createComponent(true);

      expect(component.getGuideLink('a-guide')).toBe('/help/a-guide');
    });
  });

  describe('getRouteLink', () => {
    it('should build the path to a route', () => {
      createComponent(true);

      expect(component.getRouteLink('contact')).toBe('/contact');
    });
  });
});
