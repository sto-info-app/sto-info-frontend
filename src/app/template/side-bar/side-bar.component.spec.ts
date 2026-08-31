import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SideBarComponent } from './side-bar.component';

describe('SideBarComponent', () => {
  let component: SideBarComponent;
  let fixture: ComponentFixture<SideBarComponent>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let authServiceSpy: Pick<AuthService, 'isLoggedInAsAdmin'>;

  /**
   * Builds the component with the current provider stubs.
   */
  const createComponent = (): void => {
    fixture = TestBed.createComponent(SideBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/test'),
    } as unknown as jest.Mocked<RoutingService>;

    authServiceSpy = {
      isLoggedInAsAdmin: jest.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      imports: [SideBarComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map(), data: {} },
            queryParams: of({}),
          },
        },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with theme text', () => {
    expect(component.themePanel6RandomText).toBeTruthy();
  });

  it('should get route link', () => {
    expect(component.getRouteLink('test')).toBe('/test');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('test');
  });

  it('should offer the Community link in both signed-in states', () => {
    const linkTextsWhenSignedOut: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sidebar-buttons a'),
      (link: HTMLAnchorElement) => link.textContent?.trim() ?? '',
    );
    expect(linkTextsWhenSignedOut).toContain('Register');
    expect(linkTextsWhenSignedOut).toContain('Community');

    fixture.componentRef.setInput('isLoggedIn', true);
    fixture.detectChanges();

    const linkTextsWhenSignedIn: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sidebar-buttons a'),
      (link: HTMLAnchorElement) => link.textContent?.trim() ?? '',
    );
    expect(linkTextsWhenSignedIn).not.toContain('Register');
    expect(linkTextsWhenSignedIn).toContain('Community');
  });

  // Help is for the whole application rather than any one feature, so it is
  // offered to everybody, signed in or not.
  it('should offer the Help link in both signed-in states', () => {
    const linkLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.sidebar-buttons a',
        ),
      ).map(link => link.textContent?.trim() ?? '');

    expect(linkLabels()).toContain('Help');

    fixture.componentRef.setInput('isLoggedIn', true);
    fixture.detectChanges();

    expect(linkLabels()).toContain('Help');
  });

  it('should return admin status from auth service', () => {
    expect(component.isAdmin).toBe(false);

    (authServiceSpy.isLoggedInAsAdmin as jest.Mock).mockReturnValue(true);
    expect(component.isAdmin).toBe(true);
  });

  describe('Storytime link', () => {
    /**
     * Reads the sidebar's link labels.
     *
     * @returns The text of every sidebar link.
     */
    const linkLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.sidebar-buttons a',
        ),
      ).map(link => link.textContent?.trim() ?? '');

    // A link that appears and then disappears is worse than one that arrives
    // a moment late, so the default has to be hidden.
    it('should default to hidden before the feature state is known', () => {
      expect(component.isStorytimeEnabled).toBe(false);
      expect(linkLabels()).not.toContain('Storytime');
    });

    it('should offer Storytime once the feature is switched on', () => {
      fixture.componentRef.setInput('isStorytimeEnabled', true);
      fixture.detectChanges();

      expect(linkLabels()).toContain('Storytime');
    });

    // Storytime is a section of the site, not a set of peers to Community and
    // Help. Its own pages are reached from its landing page, where each can be
    // described; the sidebar offers the way in and nothing else.
    it.each([
      'Arcs',
      'Spotlight',
      'Your Library',
      'Your Stories',
      'Your Arcs',
      'Invitations',
    ])('should not offer the %s link to a signed-out visitor', label => {
      fixture.componentRef.setInput('isStorytimeEnabled', true);
      fixture.detectChanges();

      expect(linkLabels()).not.toContain(label);
    });

    it.each([
      'Arcs',
      'Spotlight',
      'Your Library',
      'Your Stories',
      'Your Arcs',
      'Invitations',
    ])('should not offer the %s link to a signed-in member', label => {
      fixture.componentRef.setInput('isStorytimeEnabled', true);
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();

      expect(linkLabels()).not.toContain(label);
    });

    it('should offer exactly one Storytime entry to a signed-in member', () => {
      fixture.componentRef.setInput('isStorytimeEnabled', true);
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();

      expect(linkLabels().filter(label => label === 'Storytime')).toHaveLength(
        1,
      );
    });

    it('should hide the Storytime link while the feature is switched off', () => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();

      expect(linkLabels()).not.toContain('Storytime');
    });
  });

  // Every sidebar entry stays lit while a page beneath it is being read: the
  // address is matched on its opening segments rather than in full. Exactly
  // one button is lit at a time, so the frame always says where the reader is.
  describe('active entry', () => {
    let routedFixture: ComponentFixture<SideBarComponent>;
    let router: Router;

    /**
     * Reads the labels of the lit sidebar entries.
     *
     * @returns The text of every sidebar link carrying the active class.
     */
    const litLabels = (): string[] =>
      Array.from(
        (routedFixture.nativeElement as HTMLElement).querySelectorAll(
          '.sidebar-buttons a.peach',
        ),
      ).map(link => link.textContent?.trim() ?? '');

    /**
     * Renders the sidebar, then navigates.
     *
     * Nothing is rendered after the navigation on purpose. A component that
     * declares no strategy gets `OnPush` in Angular 22, and a navigation
     * elsewhere on the page does not dirty this view, so every entry has to
     * put itself right off the router's own events. Rendering again here
     * would hide an entry that cannot.
     *
     * @param url The address to visit.
     * @param isLoggedIn Whether the visitor is signed in.
     */
    const visit = async (url: string, isLoggedIn = true): Promise<void> => {
      routedFixture.componentRef.setInput('isLoggedIn', isLoggedIn);
      routedFixture.componentRef.setInput('isStorytimeEnabled', true);
      routedFixture.detectChanges();

      await router.navigateByUrl(url);
    };

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [SideBarComponent],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          {
            provide: AuthService,
            useValue: { isLoggedInAsAdmin: jest.fn().mockReturnValue(true) },
          },
        ],
      });

      router = TestBed.inject(Router);
      routedFixture = TestBed.createComponent(SideBarComponent);
    });

    it.each([
      ['/register', 'Register'],
      ['/register/complete', 'Register'],
    ])('should light Register at %s', async (url, label) => {
      await visit(url, false);

      expect(litLabels()).toEqual([label]);
    });

    it.each([
      ['/community', 'Community'],
      ['/community/registry/profiles/somebody', 'Community'],
      ['/community/friends', 'Community'],
      ['/storytime', 'Storytime'],
      ['/storytime/stories/a-story', 'Storytime'],
      ['/dashboard', 'Dashboard'],
      ['/dashboard/settings', 'Dashboard'],
      ['/dashboard/profile', 'Dashboard'],
      ['/dashboard/accounts', 'Your Accounts'],
      ['/dashboard/accounts/add', 'Your Accounts'],
      ['/dashboard/accounts/a-handle/endeavours', 'Your Accounts'],
      ['/dashboard/stats', 'Stats'],
      ['/dashboard/stats/some-breakdown', 'Stats'],
      ['/admin', 'Admin'],
      ['/admin/permissions', 'Admin'],
      ['/admin/news/12/edit', 'Admin'],
      ['/help', 'Help'],
      ['/help/getting-started', 'Help'],
    ])('should light exactly %s at %s', async (url, label) => {
      await visit(url);

      expect(litLabels()).toEqual([label]);
    });

    // A query string or fragment says nothing about which section is being
    // read, so it must not put the frame's lights out.
    it('should ignore the query string and fragment', async () => {
      await visit('/dashboard/settings?tab=privacy#alerts');

      expect(litLabels()).toEqual(['Dashboard']);
    });

    // The dashboard's own button stands down while one of its sections is
    // being read, so the two never light together.
    it('should not light the Dashboard alongside one of its sections', async () => {
      await visit('/dashboard/accounts/a-handle');

      expect(litLabels()).not.toContain('Dashboard');
    });

    // The reported fault: a header button navigates, nothing else about the
    // sidebar changes, and the entry that should have lit stayed dark.
    it('should follow a navigation that leaves the rest of the sidebar alone', async () => {
      await visit('/news/some-post');
      expect(litLabels()).toEqual([]);

      await router.navigateByUrl('/dashboard');
      expect(litLabels()).toEqual(['Dashboard']);

      await router.navigateByUrl('/dashboard/accounts');
      expect(litLabels()).toEqual(['Your Accounts']);

      await router.navigateByUrl('/dashboard/settings');
      expect(litLabels()).toEqual(['Dashboard']);

      await router.navigateByUrl('/admin/permissions');
      expect(litLabels()).toEqual(['Admin']);
    });

    it('should light nothing on a page outside the sidebar', async () => {
      await visit('/news/some-post');

      expect(litLabels()).toEqual([]);
    });
  });

  describe('onResize', () => {
    const createMockEvent = (height: number): Event => {
      const mockElement = {
        getBoundingClientRect: () => ({ height }),
      } as HTMLElement;

      return {
        target: mockElement,
      } as unknown as Event;
    };

    const resizeCases = [
      {
        height: 800,
        panel5: false,
        panel7: false,
        panel10: false,
        panel8: false,
      },
      {
        height: 900,
        panel5: true,
        panel7: false,
        panel10: false,
        panel8: false,
      },
      {
        height: 1200,
        panel5: true,
        panel7: true,
        panel10: false,
        panel8: false,
      },
      {
        height: 1500,
        panel5: true,
        panel7: true,
        panel10: true,
        panel8: false,
      },
      { height: 1800, panel5: true, panel7: true, panel10: true, panel8: true },
    ];

    test.each(resizeCases)(
      'should set panel visibility for height $height',
      ({ height, panel5, panel7, panel10, panel8 }) => {
        const event = createMockEvent(height);
        component.onResize(event);

        expect(component.isPanel5Hidden).toBe(panel5);
        expect(component.isPanel7Hidden).toBe(panel7);
        expect(component.isPanel10Hidden).toBe(panel10);
        expect(component.isPanel8Hidden).toBe(panel8);
      },
    );

    it('should handle null target', () => {
      const event = { target: null } as Event;
      component.onResize(event);

      expect(component.isPanel5Hidden).toBe(false);
      expect(component.isPanel7Hidden).toBe(false);
      expect(component.isPanel10Hidden).toBe(false);
      expect(component.isPanel8Hidden).toBe(false);
    });
  });
});
