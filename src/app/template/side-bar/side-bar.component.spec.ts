import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
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
