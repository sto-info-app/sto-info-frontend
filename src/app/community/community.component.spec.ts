import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let fixture: ComponentFixture<CommunityComponent>;
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

  it('should navigate the section from the community tab strip', () => {
    render();

    const tabs = fixture.nativeElement.querySelectorAll(
      'app-community-tabs .lcars-tab',
    );

    expect(tabs).toHaveLength(5);
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
    expect(text).not.toContain('Fleets');
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

    expect(tabs).toHaveLength(6);
    expect(tabs[5].textContent.trim()).toBe('Friends');
  });
});
