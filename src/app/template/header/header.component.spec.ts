import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { HealthService } from 'src/app/core/health/health.service';
import { NotificationService } from 'src/app/notifications/notification.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let authServiceSpy: jest.Mocked<Pick<AuthService, 'isLoggedInAsAdmin'>> & {
    isLoggedIn$: BehaviorSubject<boolean>;
  };
  let notificationServiceSpy: jest.Mocked<
    Pick<NotificationService, 'refreshUnreadCount'>
  > & { unreadCount$: BehaviorSubject<number> };
  let healthServiceSpy: { degraded$: BehaviorSubject<boolean> };
  let activatedRouteStub: {
    snapshot: { paramMap: Map<string, string>; data: Record<string, unknown> };
    queryParams: ReturnType<typeof of<Record<string, unknown>>>;
    firstChild: null;
  };

  beforeEach(() => {
    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/test'),
    } as unknown as jest.Mocked<RoutingService>;

    authServiceSpy = {
      isLoggedInAsAdmin: jest.fn(() => false),
      isLoggedIn$: new BehaviorSubject<boolean>(false),
    };

    notificationServiceSpy = {
      refreshUnreadCount: jest.fn(() => of({ unreadCount: 0 })),
      unreadCount$: new BehaviorSubject<number>(0),
    };

    healthServiceSpy = {
      degraded$: new BehaviorSubject<boolean>(false),
    };

    activatedRouteStub = {
      snapshot: { paramMap: new Map(), data: {} },
      queryParams: of({}),
      firstChild: null,
    };

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: HealthService, useValue: healthServiceSpy },
      ],
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dynamic theme data', () => {
    expect(component.dataCascade).toBeTruthy();
    expect(component.themePanel2RandomText).toBeTruthy();
  });

  describe('Scroll functionality', () => {
    it('should toggle scroll button based on scroll position', () => {
      // Mock scrollY
      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: 150,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(true);

      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: 0,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(false);
    });

    it('should handle undefined scrollY', () => {
      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: undefined,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(false);
    });

    it('should scroll to top when scrollToTop is called', () => {
      const scrollToSpy = jest.fn();
      Object.defineProperty(globalThis, 'scrollTo', {
        writable: true,
        value: scrollToSpy,
      });

      component.scrollToTop();
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });

    it('should update the button visibility on a real window scroll event, driving Angular change detection', () => {
      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: 150,
      });

      globalThis.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(component.showScrollButton).toBe(true);
    });
  });

  it('should get route link', () => {
    expect(component.getRouteLink('test')).toBe('/test');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('test');
  });

  it('should check admin status', () => {
    const authService = TestBed.inject(AuthService);
    const isAdminSpy = jest
      .spyOn(authService, 'isLoggedInAsAdmin')
      .mockReturnValue(true);

    const isAdmin = component.isAdmin;
    expect(isAdmin).toBe(true);
    expect(isAdminSpy).toHaveBeenCalled();
  });

  it('should swallow refresh unread errors on login state changes', () => {
    notificationServiceSpy.refreshUnreadCount.mockReturnValueOnce(
      throwError(() => new Error('unread failed')),
    );

    component.ngOnInit();
    authServiceSpy.isLoggedIn$.next(true);

    expect(notificationServiceSpy.refreshUnreadCount).toHaveBeenCalled();
  });

  it('should not carry the Community link in the top nav', () => {
    const navTexts: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('#nav-standard a'),
      (link: HTMLAnchorElement) => link.textContent?.trim() ?? '',
    );

    expect(navTexts).toEqual(['Home', 'About', 'Dashboard', 'News']);
  });
  describe('API degraded alert', () => {
    // The route gate and the health stream are both read when the template
    // first subscribes, so they have to be arranged before the initial
    // detectChanges rather than after it.
    const renderWith = (requiresApi: boolean, degraded: boolean) => {
      activatedRouteStub.snapshot.data = requiresApi
        ? { requiresApi: true }
        : {};
      healthServiceSpy.degraded$.next(degraded);

      fixture = TestBed.createComponent(HeaderComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    const degradedAlert = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('#header-api-degraded-alert');

    it('should show the connection warning in the cascade area when the API is degraded', () => {
      renderWith(true, true);

      const alert = degradedAlert();
      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain('Connection Unstable');
    });

    it('should offer nothing to click, since the warning clears itself', () => {
      renderWith(true, true);

      expect(degradedAlert()?.querySelectorAll('a, button')).toHaveLength(0);
    });

    it('should take the cascade area over from the data cascade', () => {
      renderWith(true, true);

      expect(fixture.nativeElement.querySelector('#default')).toBeNull();
    });

    it('should take precedence over the unread notifications alert', () => {
      notificationServiceSpy.unreadCount$.next(5);

      renderWith(true, true);

      expect(degradedAlert()).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('#header-comms-alert'),
      ).toBeNull();
    });

    it('should stay hidden on routes that do not need the API', () => {
      renderWith(false, true);

      expect(degradedAlert()).toBeNull();
      expect(fixture.nativeElement.querySelector('#default')).toBeTruthy();
    });

    it('should stay hidden while the API is healthy', () => {
      renderWith(true, false);

      expect(degradedAlert()).toBeNull();
      expect(fixture.nativeElement.querySelector('#default')).toBeTruthy();
    });
  });
});
