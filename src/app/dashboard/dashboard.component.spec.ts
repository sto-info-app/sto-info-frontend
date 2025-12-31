import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { RoutingService } from '../shared/services/routing.service';
import { DashboardComponent } from './dashboard.component';
import { User } from './models/user.model';
import { DashboardService } from './services/dashboard.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRoutingService: jest.Mocked<RoutingService>;

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
    } as unknown as jest.Mocked<AuthService>;

    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load user data and set greeting on init', () => {
    fixture.detectChanges();
    expect(mockDashboardService.getUser).toHaveBeenCalled();
    expect(component.user).toEqual(mockUser);
    expect(component.userGreeting).toContain('Picard');
  });

  it('should perform logout if account is disabled', () => {
    const disabledUser = { ...mockUser, isAccountDisabled: true };
    mockDashboardService.getUser.mockReturnValue(of(disabledUser));

    fixture.detectChanges();

    expect(mockAuthService.performLogout).toHaveBeenCalled();
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
});
