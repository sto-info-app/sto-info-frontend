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
    expect(link.textContent?.trim()).toBe('Help with Privacy Mode');
    expect(link.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });
});
