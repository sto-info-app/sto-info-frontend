import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let fixture: ComponentFixture<CommunityComponent>;
  let component: CommunityComponent;
  let authServiceSpy: { isLoggedIn: jest.Mock };

  beforeEach(async () => {
    authServiceSpy = { isLoggedIn: jest.fn(() => false) };

    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
    component = fixture.componentInstance;
  });

  /**
   * Renders the page. Signed-in state has to be arranged before the first
   * render: nothing marks the view dirty afterwards, so a later
   * `detectChanges` would not pick the change up.
   *
   * @param loggedIn - Whether the visitor is signed in.
   */
  function render(loggedIn = false): void {
    authServiceSpy.isLoggedIn.mockReturnValue(loggedIn);
    fixture.detectChanges();
  }

  it('should render the registry links in the side column', () => {
    render();

    const links = fixture.nativeElement.querySelectorAll(
      '#community-side-column .buttons a',
    );

    expect(links).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Search the Registry');
    expect(fixture.nativeElement.textContent).toContain('Recently Joined');
    expect(fixture.nativeElement.textContent).toContain('Recently Active');
    expect(fixture.nativeElement.textContent).toContain('Profiles');
  });

  it('should use the two-column page shell', () => {
    render();

    expect(
      fixture.nativeElement.querySelector('#community-main-column'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('#community-side-column'),
    ).toBeTruthy();
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
    expect(text).not.toContain('Fleets');
    expect(text).not.toContain('Events');
  });

  it('should hide the friends link from a signed-out visitor', () => {
    render();

    expect(component.isLoggedIn).toBe(false);
    expect(
      fixture.nativeElement.querySelectorAll(
        '#community-side-column .buttons a',
      ),
    ).toHaveLength(4);
  });

  it('should show the friends link to a signed-in officer', () => {
    render(true);

    const links = fixture.nativeElement.querySelectorAll(
      '#community-side-column .buttons a',
    );
    expect(links).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('Friends');
  });

  it('should delegate route links to the routing service', () => {
    render();

    expect(component.getRouteLink('community/registry/search')).toBe(
      '/community/registry/search',
    );
  });
});
