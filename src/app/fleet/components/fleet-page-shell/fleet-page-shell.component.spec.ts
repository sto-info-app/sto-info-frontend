import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FleetPageShellComponent } from './fleet-page-shell.component';
import { FleetShellTab } from './fleet-page-shell.model';

/**
 * A page using the shell, so that content projection is exercised the way a
 * real Fleet page exercises it rather than through the component alone.
 */
@Component({
  standalone: true,
  imports: [FleetPageShellComponent],
  template: `
    <app-fleet-page-shell
      [heading]="heading"
      [subject]="subject"
      [tabs]="tabs"
      [isLoading]="isLoading"
      [errorMessage]="errorMessage">
      <p class="projected">The roster</p>
    </app-fleet-page-shell>
  `,
})
class HostComponent {
  heading = 'Fleet Directory';
  subject: string | null = null;
  tabs: FleetShellTab[] = [];
  isLoading = false;
  errorMessage: string | null = null;
}

describe('FleetPageShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  /**
   * Finds one element in the rendered page.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  it('renders the heading and the page content', () => {
    fixture.detectChanges();

    expect(find('h1')?.textContent).toContain('Fleet Directory');
    expect(find('.projected')).not.toBeNull();
  });

  it('names what the page is about under its heading', () => {
    host.subject = 'Starfleet Command · PC';

    fixture.detectChanges();

    expect(find('.fleet-page-shell__subject')?.textContent).toContain(
      'Starfleet Command · PC',
    );
  });

  it('leaves out the subject line when the page is not about one thing', () => {
    fixture.detectChanges();

    expect(find('.page-subject-row')).toBeNull();
  });

  describe('while loading', () => {
    beforeEach(() => {
      host.isLoading = true;
      fixture.detectChanges();
    });

    it('shows the standard loading bar', () => {
      expect(find('app-loading-bar')).not.toBeNull();
    });

    // A heading over an empty page reads as a page that has finished and has
    // nothing in it.
    it('keeps the heading', () => {
      expect(find('h1')).not.toBeNull();
    });

    it('holds the content back until there is something to show', () => {
      expect(find('.projected')).toBeNull();
    });
  });

  describe('when the page could not be built', () => {
    beforeEach(() => {
      host.errorMessage = 'That Fleet could not be read.';
      fixture.detectChanges();
    });

    it('shows the message on the standard error panel', () => {
      expect(find('app-lcars-error-message')?.textContent).toContain(
        'That Fleet could not be read.',
      );
    });

    // Leaving a half-built list under an error invites the reader to trust it.
    it('replaces the content rather than sitting above it', () => {
      expect(find('.projected')).toBeNull();
    });
  });

  /**
   * The error surface renders its message as text. The warning component is
   * the one that renders HTML, and this input carries server and import text,
   * so reaching for it here would be the injection the acceptance criteria
   * forbid.
   */
  it('does not use the HTML-rendering warning component', () => {
    host.errorMessage = '<img src="x" onerror="alert(1)">';

    fixture.detectChanges();

    expect(find('app-lcars-warning-message')).toBeNull();
    expect(find('app-lcars-error-message img')).toBeNull();
    expect(find('app-lcars-error-message')?.textContent).toContain('<img');
  });

  describe('the tab strip', () => {
    beforeEach(() => {
      host.tabs = [
        { link: '/fleets', label: 'Fleets', exact: true },
        { link: '/fleets/roster', label: 'Roster', exact: false },
      ];
      fixture.detectChanges();
    });

    it('draws one tab per section', () => {
      expect(
        fixture.nativeElement.querySelectorAll('a.lcars-tab'),
      ).toHaveLength(2);
    });

    // Each Fleet section is its own route, which is what keeps it bookmarkable
    // and the back button honest.
    it('makes every tab a link', () => {
      const tabs = Array.from(
        fixture.nativeElement.querySelectorAll('a.lcars-tab'),
      ) as HTMLAnchorElement[];

      expect(tabs.every(tab => tab.getAttribute('href') !== null)).toBe(true);
    });

    it('names the strip for a reader moving by landmark', () => {
      expect(find('nav.lcars-tabs')?.getAttribute('aria-label')).toBe(
        'Fleet sections',
      );
    });

    it('closes the strip with its filler', () => {
      expect(find('.lcars-tabs-filler')).not.toBeNull();
    });
  });

  it('draws no strip at all for a page with no sections', () => {
    fixture.detectChanges();

    expect(find('nav.lcars-tabs')).toBeNull();
  });
});
