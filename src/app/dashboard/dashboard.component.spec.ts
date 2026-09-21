import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { CommunitySubscriptionService } from '../fleet/community-subscription.service';
import { FollowedCommunity } from '../models/fleet.models';
import { FleetConfigurationService } from '../shared/services/fleet-configuration.service';
import { RoutingService } from '../shared/services/routing.service';
import { DashboardComponent } from './dashboard.component';
import { StoAccount } from './models/sto-account.model';
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
  let mockFleetConfiguration: jest.Mocked<FleetConfigurationService>;
  let mockSubscriptions: jest.Mocked<CommunitySubscriptionService>;

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

    // Stubbed rather than left to the real service: HttpClient is
    // provided in this environment, so an unstubbed configuration read
    // issues a request that fails, and a failure is read as offered.
    mockFleetConfiguration = {
      isOffered: jest.fn().mockReturnValue(of(true)),
    } as unknown as jest.Mocked<FleetConfigurationService>;

    mockSubscriptions = {
      listFollowed: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<CommunitySubscriptionService>;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: StoAccountService, useValue: mockStoAccountService },
        {
          provide: FleetConfigurationService,
          useValue: mockFleetConfiguration,
        },
        { provide: CommunitySubscriptionService, useValue: mockSubscriptions },
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
        of([{ id: '1' }, { id: '2' }] as unknown as StoAccount[]),
      );

      component.ngOnInit();

      expect(component.accountsCount).toBe(2);
    });

    it('should call detectChanges when getAccounts errors', () => {
      const cdrSpy = jest.spyOn(component['_cdr'], 'detectChanges');
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

  describe('publicProfileLink', () => {
    it('should link to the member registry profile when listed publicly', () => {
      fixture.detectChanges();

      expect(component.publicProfileLink).toEqual([
        '/community/registry/profiles',
        'testuser',
      ]);
      expect(fixture.nativeElement.textContent).toContain(
        'View Public Profile',
      );
    });

    it('should offer no public profile link when not listed publicly', () => {
      mockDashboardService.getUser.mockReturnValue(
        of({
          ...mockUser,
          profile: { ...mockUser.profile!, publiclyVisible: false },
        }),
      );

      fixture.detectChanges();

      expect(component.publicProfileLink).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(
        'View Public Profile',
      );
    });

    it('should offer no public profile link before the user has loaded', () => {
      expect(component.publicProfileLink).toBeNull();
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

  describe('the Fleet tile', () => {
    const follows = (count: number): FollowedCommunity[] =>
      Array.from({ length: count }, () => ({}) as FollowedCommunity);

    const tiles = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.dashboard-tile'));

    // Whether the section is offered is read once, as the component is
    // constructed, so a test that changes the answer has to build the
    // component again rather than only draw it again.
    const rebuild = (): void => {
      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('should offer the section when it is offered', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Fleets');
      expect(fixture.nativeElement.textContent).toContain(
        'Communities You Follow',
      );
    });

    it('should offer nothing when the section is not offered', () => {
      mockFleetConfiguration.isOffered.mockReturnValue(of(false));

      rebuild();

      expect(fixture.nativeElement.textContent).not.toContain('Fleets');
      expect(fixture.nativeElement.textContent).not.toContain(
        'Communities You Follow',
      );
    });

    it('should not ask what is followed when it is not offered', () => {
      mockFleetConfiguration.isOffered.mockReturnValue(of(false));

      fixture.detectChanges();

      expect(mockSubscriptions.listFollowed).not.toHaveBeenCalled();
    });

    it('should count what is followed', () => {
      mockSubscriptions.listFollowed.mockReturnValue(of(follows(3)));

      fixture.detectChanges();

      expect(component.followedCommunitiesCount).toBe(3);
      expect(fixture.nativeElement.textContent).toContain('Following 3');
    });

    it('should give no count when nothing is followed', () => {
      fixture.detectChanges();

      expect(component.followedCommunitiesCount).toBe(0);
      expect(fixture.nativeElement.textContent).not.toContain('Following');
    });

    it('should leave the count unknown when it cannot be read', () => {
      mockSubscriptions.listFollowed.mockReturnValue(
        throwError(() => new Error('offline')),
      );

      fixture.detectChanges();

      expect(component.followedCommunitiesCount).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Fleets');
      expect(fixture.nativeElement.textContent).not.toContain('Following');
    });

    it('should make every tile a link a keyboard can reach', () => {
      fixture.detectChanges();

      expect(tiles()).toHaveLength(5);
      expect(tiles().every(tile => tile.tagName === 'A')).toBe(true);
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      const nextSpy = jest.spyOn(component['_destroy$'], 'next');
      const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from active subscriptions on destroy', () => {
      component.ngOnInit();
      const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

      component.ngOnDestroy();

      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
