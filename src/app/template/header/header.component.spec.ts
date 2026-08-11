import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
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

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
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
        { provide: NotificationService, useValue: notificationServiceSpy },
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
});
