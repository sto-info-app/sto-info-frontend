import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  STORYTIME_POLICY_EFFECTIVE_DATE,
  STORYTIME_POLICY_VERSION,
} from '../../storytime.constants';
import { PolicyHeaderComponent } from './policy-header.component';

describe('PolicyHeaderComponent', () => {
  let fixture: ComponentFixture<PolicyHeaderComponent>;

  /**
   * Renders the header above one of the three documents.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture.componentRef.setInput('title', 'A Document');
    fixture.componentRef.setInput('intro', 'What it is for.');
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Reads the tab strip.
   *
   * @returns Each tab's label paired with where it goes.
   */
  const tabs = (): { label: string; href: string | null }[] =>
    [...render().querySelectorAll('nav.lcars-tabs a.lcars-tab')].map(tab => ({
      label: tab.textContent?.trim() ?? '',
      href: tab.getAttribute('href'),
    }));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PolicyHeaderComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(PolicyHeaderComponent);
  });

  it('is created', () => {
    expect(render()).toBeTruthy();
  });

  it('shows the title and intro it was given', () => {
    const element = render();

    expect(element.querySelector('h1')?.textContent).toContain('A Document');
    expect(element.textContent).toContain('What it is for.');
  });

  // A creator asked to accept terms has to be able to tell which terms.
  it('states the version and when it took effect in the same style as the main policy pages', () => {
    const element = render();
    const text = element.textContent ?? '';

    expect(text).toContain('Version:');
    expect(text).toContain(STORYTIME_POLICY_VERSION);
    expect(text).toContain('Effective Date:');
    expect(text).toContain(STORYTIME_POLICY_EFFECTIVE_DATE);
    expect(element.querySelectorAll('strong.go-gold')).toHaveLength(2);
    expect(element.querySelectorAll('span.go-roseblush')).toHaveLength(2);
  });

  // The three documents defer to each other, so the set has to be reachable
  // from whichever one a reader landed on.
  it('offers a tab for each of the three documents', () => {
    expect(tabs()).toEqual([
      {
        label: 'Content Policy',
        href: `/${APP_ROUTES.STORYTIME_CONTENT_POLICY}`,
      },
      { label: 'Terms of Use', href: `/${APP_ROUTES.STORYTIME_TERMS}` },
      {
        label: 'Fan Content & IP Notice',
        href: `/${APP_ROUTES.STORYTIME_FAN_CONTENT}`,
      },
    ]);
  });

  // Nothing tells the strip which document it sits above: `routerLinkActive`
  // reads the URL, so the lit tab cannot disagree with the page.
  it('lights no tab and marks no current page away from the documents', () => {
    const element = render();

    expect(element.querySelectorAll('.lcars-tab.active')).toHaveLength(0);
    expect(element.querySelector('[aria-current="page"]')).toBeNull();
  });

  // The LCARS strip is closed by an end cap, which is decoration rather than
  // anything a screen reader should announce as a tab.
  it('hides the strip end cap from assistive technology', () => {
    const filler = render().querySelector('.lcars-tabs-filler');

    expect(filler?.getAttribute('aria-hidden')).toBe('true');
  });
});
