import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BehaviorSubject } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let fixture: ComponentFixture<CommunityComponent>;
  let authServiceSpy: { isLoggedIn: jest.Mock };
  let fleetOffered$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    authServiceSpy = { isLoggedIn: jest.fn(() => false) };
    fleetOffered$ = new BehaviorSubject<boolean>(true);

    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        {
          provide: FleetConfigurationService,
          useValue: { isOffered: () => fleetOffered$ },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
  });

  /**
   * Renders the page. Signed-in state has to be arranged before the first
   * render: nothing marks the view dirty afterwards, so a later
   * `detectChanges` would not pick the change up.
   *
   * @param loggedIn - Whether the visitor is signed in.
   * @param fleetOffered - Whether the Fleet section is being offered.
   */
  function render(loggedIn = false, fleetOffered = true): void {
    authServiceSpy.isLoggedIn.mockReturnValue(loggedIn);
    fleetOffered$.next(fleetOffered);
    fixture.detectChanges();
  }

  /**
   * The addresses of the links in the Fleet block.
   *
   * @returns Every href inside the block's button row.
   */
  function fleetLinks(): (string | null)[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Fleet directories"] a',
      ),
    ).map(link => (link as HTMLAnchorElement).getAttribute('href'));
  }

  it('should navigate the section from the community tab strip', () => {
    render();

    const tabs = fixture.nativeElement.querySelectorAll(
      'app-community-tabs .lcars-tab',
    );

    expect(tabs).toHaveLength(6);
    expect(fixture.nativeElement.textContent).toContain('Recently Joined');
    expect(fixture.nativeElement.textContent).toContain('Recently Active');
  });

  it('should mark itself as the About tab', () => {
    render();

    const about = fixture.nativeElement.querySelector(
      'app-community-tabs .lcars-tab',
    );

    expect(about.textContent.trim()).toBe('About');
  });

  it('should state that the registry is opt-in', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'Nothing appears here until you opt in',
    );
  });

  it('should explain that a friend request has to be accepted', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'has to be accepted before it becomes a friendship',
    );
  });

  it('should explain what blocking does and that it is silent', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'hides your records from each other',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'The other officer is never told',
    );
  });

  it('should not advertise unbuilt sections', () => {
    render();

    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Coming Soon');
    expect(text).not.toContain('Events');
  });

  it('should hide the friends tab from a signed-out visitor', () => {
    render();

    // Checked against the tab labels rather than the page text: the About copy
    // describes the friends list whether or not the visitor is signed in.
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('app-community-tabs .lcars-tab'),
    ).map(tab => (tab as HTMLElement).textContent?.trim());

    expect(labels).not.toContain('Friends');
  });

  it('should show the friends tab to a signed-in officer', () => {
    render(true);

    const tabs = fixture.nativeElement.querySelectorAll(
      'app-community-tabs .lcars-tab',
    );

    expect(tabs).toHaveLength(7);
    expect(tabs[5].textContent.trim()).toBe('Friends');
  });

  describe('the Fleet section', () => {
    it('should say what a Community, a Fleet and an Armada each are', () => {
      render();

      const text = fixture.nativeElement.textContent;

      expect(text).toContain('is the group behind one or more');
      expect(text).toContain('is a set of fleets that have allied');
      expect(text).toContain('can also be listed on its own');
    });

    // The same sentence the Fleet page carries. Somebody who reads about
    // following here and follows from there should have been told the same
    // thing in both places.
    it('should say that following is not membership', () => {
      render();

      expect(fixture.nativeElement.textContent).toContain(
        'Following a Community is not membership of it',
      );
    });

    it('should offer all three directories', () => {
      render();

      expect(fleetLinks()).toEqual([
        '/fleets',
        '/fleets/communities',
        '/fleets/armadas',
      ]);
    });

    it('should offer registration to a signed-in officer', () => {
      render(true);

      expect(fleetLinks()).toContain('/fleets/register');
      expect(fixture.nativeElement.textContent).toContain(
        'Register a Community',
      );
    });

    // Hidden rather than offered and then refused by the guard, which is
    // how every other guarded destination in the navigation behaves.
    it('should hide registration from a signed-out visitor', () => {
      render();

      expect(fleetLinks()).not.toContain('/fleets/register');
    });

    // The block goes entirely rather than losing its links: prose
    // describing something that is not there is worse than silence.
    it('should say nothing at all when the section is not offered', () => {
      render(true, false);

      expect(fleetLinks()).toEqual([]);
      expect(fixture.nativeElement.textContent).not.toContain(
        'is a set of fleets that have allied',
      );
    });
  });
});
