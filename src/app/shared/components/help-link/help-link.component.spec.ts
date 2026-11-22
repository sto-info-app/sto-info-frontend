import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HelpLinkComponent } from './help-link.component';

/** Hosts the link as a page would. */
@Component({
  standalone: true,
  imports: [HelpLinkComponent],
  template: `<app-help-link
    slug="privacy-mode"
    label="Help with Privacy Mode" />`,
})
class HostComponent {}

describe('HelpLinkComponent (FC-049)', () => {
  it('links to the guide by its slug, with its label and a hidden icon', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a.help-link',
    ) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/help/privacy-mode');
    expect(link.querySelector('.help-link__label')?.textContent).toBe(
      'Help with Privacy Mode',
    );
    // The cap and the question mark are drawing, so the link is named by its
    // words alone.
    expect(
      Array.from(
        link.querySelectorAll('.help-link__cap, .help-link__mark'),
        part => part.getAttribute('aria-hidden'),
      ),
    ).toEqual(['true', 'true']);
  });
});
