import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityTabsComponent } from './community-tabs.component';

describe('CommunityTabsComponent', () => {
  let fixture: ComponentFixture<CommunityTabsComponent>;
  let component: CommunityTabsComponent;
  let authServiceSpy: { isLoggedIn: jest.Mock };

  beforeEach(async () => {
    authServiceSpy = { isLoggedIn: jest.fn(() => false) };

    await TestBed.configureTestingModule({
      imports: [CommunityTabsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityTabsComponent);
    component = fixture.componentInstance;
  });

  /**
   * Renders the strip. Signed-in state has to be arranged before the first
   * render: nothing marks the view dirty afterwards, so a later
   * `detectChanges` would not re-evaluate the tabs getter.
   *
   * @param loggedIn - Whether the visitor is signed in.
   */
  function render(loggedIn = false): void {
    authServiceSpy.isLoggedIn.mockReturnValue(loggedIn);
    fixture.detectChanges();
  }

  /**
   * The rendered tab labels, in strip order.
   *
   * @returns The trimmed label text of every tab.
   */
  function renderedLabels(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.lcars-tab')).map(
      tab => (tab as HTMLElement).textContent?.trim() ?? '',
    );
  }

  it('should open with About and list the registry sections', () => {
    render();

    expect(renderedLabels()).toEqual([
      'About',
      'Search',
      'Recently Joined',
      'Recently Active',
      'Profiles',
    ]);
  });

  it('should link each tab through the routing service', () => {
    render();

    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('.lcars-tab'),
    ).map(tab => (tab as HTMLAnchorElement).getAttribute('href'));

    expect(hrefs).toEqual([
      '/community',
      '/community/registry/search',
      '/community/registry/recently-joined',
      '/community/registry/recently-active',
      '/community/registry/profiles',
    ]);
  });

  it('should hide the friends tab from a signed-out visitor', () => {
    render();

    expect(renderedLabels()).not.toContain('Friends');
  });

  it('should offer the friends tab to a signed-in officer', () => {
    render(true);

    expect(renderedLabels()).toContain('Friends');
  });

  it('should match the About tab exactly, so it does not stay lit elsewhere', () => {
    render();

    const about = component.tabs[0];

    expect(about.label).toBe('About');
    expect(about.exact).toBe(true);
  });

  it('should match the profiles tab loosely, so it stays lit on a member page', () => {
    render();

    const profiles = component.tabs.find(tab => tab.label === 'Profiles');

    expect(profiles?.exact).toBe(false);
  });

  it('should cap the strip with the LCARS end piece', () => {
    render();

    expect(
      fixture.nativeElement.querySelector('.lcars-tabs-filler'),
    ).toBeTruthy();
  });
});
