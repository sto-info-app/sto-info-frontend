import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { RoutingService } from '../shared/services/routing.service';
import { DashboardComponent } from './dashboard.component';
import { User } from './models/user.model';
import { DashboardService } from './services/dashboard.service';
import { StoAccountService } from './services/sto-account.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRoutingService: jest.Mocked<RoutingService>;
  let mockStoAccountService: jest.Mocked<StoAccountService>;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    emailVerified: true,
    isAccountDisabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      userId: '123',
      username: 'testuser',
      firstName: 'Jean-Luc',
      lastName: 'Picard',
      publiclyVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    mockDashboardService = {
      getUser: jest.fn().mockReturnValue(of(mockUser)),
    } as unknown as jest.Mocked<DashboardService>;

    mockAuthService = {
      performLogout: jest.fn(),
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: { Authorization: 'Bearer mock-token' },
      }),
    } as unknown as jest.Mocked<AuthService>;

    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    mockStoAccountService = {
      getAccounts: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<StoAccountService>;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: StoAccountService, useValue: mockStoAccountService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load user data and set greeting on init', () => {
      component.ngOnInit();

      expect(mockDashboardService.getUser).toHaveBeenCalled();
      expect(component.user).toEqual(mockUser);
      expect(component.userGreeting).toContain('Picard');
    });

    it('should perform logout if account is disabled', () => {
      mockDashboardService.getUser.mockReturnValue(
        of({ ...mockUser, isAccountDisabled: true }),
      );

      component.ngOnInit();

      expect(mockAuthService.performLogout).toHaveBeenCalled();
    });

    it('should warn on console and leave user undefined when getUser errors', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const err = new Error('network error');
      mockDashboardService.getUser.mockReturnValue(throwError(() => err));

      component.ngOnInit();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load user data',
        err,
      );
      expect(component.user).toBeUndefined();
      consoleWarnSpy.mockRestore();
    });

    it('should set accountsCount from getAccounts response', () => {
      mockStoAccountService.getAccounts.mockReturnValue(
        of([{ id: '1' }, { id: '2' }] as { id: string }[]),
      );

      component.ngOnInit();

      expect(component.accountsCount).toBe(2);
    });

    it('should call detectChanges when getAccounts errors', () => {
      const cdrSpy = jest.spyOn(component['cdr'], 'detectChanges');
      mockStoAccountService.getAccounts.mockReturnValue(
        throwError(() => new Error('fetch failed')),
      );

      component.ngOnInit();

      expect(cdrSpy).toHaveBeenCalled();
    });
  });

  describe('displayWelcomeText', () => {
    it('should show random greeting with last name if available', () => {
      component.user = { profile: { lastName: 'Riker' } } as User;
      const greeting = component.displayWelcomeText();
      expect(greeting).toMatch(/, Captain Riker!$/);
    });

    it('should show random greeting with first name if last name is missing', () => {
      component.user = { profile: { firstName: 'Will' } } as User;
      const greeting = component.displayWelcomeText();
      expect(greeting).toMatch(/, Will!$/);
    });

    it('should show random greeting if both names are missing', () => {
      component.user = { profile: {} } as User;
      const greeting = component.displayWelcomeText();
      expect(greeting).toMatch(/!$/);
    });

    it('should show random greeting if user profile is missing', () => {
      component.user = undefined;
      const greeting = component.displayWelcomeText();
      expect(greeting).toMatch(/!$/);
    });
  });

  it('should return route link from routing service', () => {
    const link = component.getRouteLink('some-route');
    expect(mockRoutingService.getLink).toHaveBeenCalledWith('some-route');
    expect(link).toBe('/mock-route');
  });

  it('should set unavailable photo on image error', () => {
    const event = { target: { src: '' } } as unknown as Event;
    component.onProfileImageError(event);
    expect((event.target as HTMLImageElement).src).toBe(
      component.unavailablePhotoSrc,
    );
  });

  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from active subscriptions on destroy', () => {
      component.ngOnInit();
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
