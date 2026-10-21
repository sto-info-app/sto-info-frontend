import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from 'src/app/core/auth/auth.service';

import { SETTINGS_LINKS } from 'src/app/shared/constants/settings-links.constants';

import { SettingsLinkComponent } from './settings-link.component';

describe('SettingsLinkComponent', () => {
  let signedIn: boolean;

  beforeEach(() => {
    signedIn = true;
    TestBed.configureTestingModule({
      imports: [SettingsLinkComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => signedIn } },
      ],
    });
  });

  /**
   * Shows a cog.
   *
   * @param target - Where it leads.
   * @returns Its link.
   */
  function show(
    target: (typeof SETTINGS_LINKS)[keyof typeof SETTINGS_LINKS],
  ): HTMLAnchorElement | null {
    const fixture = TestBed.createComponent(SettingsLinkComponent);

    fixture.componentRef.setInput('target', target);
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement).querySelector('a');
  }

  it('goes to a tab of Settings, named for screen readers and in its tooltip', () => {
    const link = show(SETTINGS_LINKS.chat) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/dashboard/settings?tab=chat');
    expect(link.getAttribute('aria-label')).toBe('Chat settings');
    expect(link.getAttribute('title')).toBe('Chat settings');
    expect(link.querySelector('i')?.classList.contains('fa-gear')).toBe(true);
    expect(link.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('goes straight to a setting when it names one', () => {
    expect(show(SETTINGS_LINKS.registry)?.getAttribute('href')).toBe(
      '/dashboard/settings?tab=account#setting-registry',
    );
  });

  it('is not shown to a visitor who is not signed in', () => {
    signedIn = false;

    expect(show(SETTINGS_LINKS.chat)).toBeNull();
  });
});
