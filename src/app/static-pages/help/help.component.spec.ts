import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { HelpComponent } from './help.component';
import { HELP_TOPICS } from './help.data';

describe('HelpComponent', () => {
  let fixture: ComponentFixture<HelpComponent>;
  let component: HelpComponent;

  /**
   * Builds the page with Storytime switched on or off.
   *
   * @param isStorytimeEnabled Whether the Storytime feature is available.
   */
  const createComponent = (isStorytimeEnabled: boolean): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HelpComponent],
      providers: [
        provideRouter([]),
        {
          provide: StorytimeService,
          useValue: { isEnabled: () => of(isStorytimeEnabled) },
        },
      ],
    });

    fixture = TestBed.createComponent(HelpComponent);
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
    createComponent(true);

    expect(component).toBeTruthy();
  });

  it('should list every guide in an available topic', () => {
    createComponent(true);

    HELP_TOPICS.forEach(topic => {
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

    // One per topic, plus the "Still stuck?" section.
    expect(bars).toHaveLength(HELP_TOPICS.length + 1);
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
