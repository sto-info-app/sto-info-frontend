import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import {
  faLock,
  faUserPen,
} from '@awesome.me/kit-5812c6b103/icons/classic/solid';
import {
  FaIconLibrary,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { of } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { DatesTimeHelperService } from 'src/app/shared/services/dates-time-helper.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { User } from '../models/user.model';
import { DashboardService } from '../services/dashboard.service';
import { EditPersonalDetailsComponent } from './dialogs/edit-personal-details/edit-personal-details.component';
import { ProfilePicComponent } from './dialogs/profile-pic/profile-pic.component';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRoutingService: jest.Mocked<RoutingService>;
  let mockDateTimeHelper: jest.Mocked<DatesTimeHelperService>;
  let mockDialog: jest.Mocked<MatDialog>;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    emailVerified: true,
    isAccountDisabled: false,
    lastLoginAt: new Date('2023-01-01T12:00:00Z'),
    lastPasswordReset: new Date('2023-01-01T12:00:00Z'),
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
    profile: {
      userId: '123',
      username: 'testuser',
      firstName: 'Jean-Luc',
      lastName: 'Picard',
      publiclyVisible: true,
      createdAt: new Date('2023-01-01T12:00:00Z'),
      updatedAt: new Date('2023-01-01T12:00:00Z'),
    },
  };

  beforeEach(async () => {
    mockDashboardService = {
      getUser: jest.fn().mockReturnValue(of(mockUser)),
    } as unknown as jest.Mocked<DashboardService>;

    mockAuthService = {
      performLogout: jest.fn(),
      refreshToken: jest.fn().mockReturnValue(of({ success: true })),
    } as unknown as jest.Mocked<AuthService>;

    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    mockDateTimeHelper = {
      timeSince: jest.fn().mockReturnValue('2 hours ago'),
    } as unknown as jest.Mocked<DatesTimeHelperService>;

    mockDialog = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, FontAwesomeModule],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: DatesTimeHelperService, useValue: mockDateTimeHelper },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ActivatedRoute, useValue: {} },
      ],
    })
      .overrideComponent(ProfileComponent, {
        remove: {
          imports: [MatDialogModule],
        },
        add: {
          providers: [{ provide: MatDialog, useValue: mockDialog }],
        },
      })
      .compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faUserPen, faLock);

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load user data on init', () => {
    fixture.detectChanges();
    expect(mockDashboardService.getUser).toHaveBeenCalled();
    expect(component.user).toEqual(mockUser);
  });

  it('should logout if account is disabled', () => {
    mockDashboardService.getUser.mockReturnValue(
      of({ ...mockUser, isAccountDisabled: true }),
    );
    fixture.detectChanges();
    expect(mockAuthService.performLogout).toHaveBeenCalled();
  });

  it('should get route link', () => {
    const link = component.getRouteLink('test');
    expect(mockRoutingService.getLink).toHaveBeenCalledWith('test');
    expect(link).toBe('/mock-route');
  });

  describe('Time helpers', () => {
    beforeEach(() => {
      component.user = mockUser;
    });

    it('should return time since last login', () => {
      expect(component.timeSinceLastLogin()).toBe('2 hours ago');
      expect(mockDateTimeHelper.timeSince).toHaveBeenCalledWith(
        mockUser.lastLoginAt,
      );
    });

    it('should return "Never" if no last login', () => {
      component.user = { ...mockUser, lastLoginAt: undefined };
      expect(component.timeSinceLastLogin()).toBe('Never');
    });

    it('should return time since last password reset', () => {
      expect(component.timeSinceLastPasswordReset()).toBe('2 hours ago');
    });

    it('should return time since last updated', () => {
      expect(component.timeSinceLastUpdated()).toBe('2 hours ago');
    });

    it('should return time since user created', () => {
      expect(component.timeSinceUserCreated()).toBe('2 hours ago');
    });

    it('should return "Never" or "Unknown" if dates are missing', () => {
      component.user = {
        ...mockUser,
        lastPasswordReset: undefined,
        profile: undefined,
      };
      expect(component.timeSinceLastPasswordReset()).toBe('Never');
      expect(component.timeSinceLastUpdated()).toBe('Unknown');
      expect(component.timeSinceUserCreated()).toBe('Unknown');
    });

    it('should return "Just now" if timeSince returns empty string', () => {
      mockDateTimeHelper.timeSince.mockReturnValue('');
      expect(component.timeSinceLastLogin()).toBe('Just now');
      expect(component.timeSinceLastPasswordReset()).toBe('Just now');
      expect(component.timeSinceLastUpdated()).toBe('Just now');
      expect(component.timeSinceUserCreated()).toBe('Just now');
    });
  });

  describe('Dialogs', () => {
    let mockDialogRef: {
      afterClosed: jest.Mock;
    };

    beforeEach(() => {
      mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(true)),
      };
      mockDialog.open.mockReturnValue(
        mockDialogRef as unknown as MatDialogRef<unknown>,
      );
      fixture.detectChanges();
    });

    it('should open edit profile dialog and refresh token if requested', () => {
      component.editUserProfile();
      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockDashboardService.getUser).toHaveBeenCalledTimes(2); // Initial + after closed
    });

    it('should open profile pic dialog', () => {
      component.editUserProfilePhoto();
      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });

    it('should not refresh token if dialog result is false', () => {
      mockDialogRef.afterClosed.mockReturnValue(of(false));
      component.editUserProfile();
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should not refresh token if profile pic dialog result is false', () => {
      mockDialogRef.afterClosed.mockReturnValue(of(false));
      component.editUserProfilePhoto();
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });
  });

  it('should handle profile image error', () => {
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

    it('should close edit profile dialog if open', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(false)), // Don't auto-close
        close: jest.fn(),
      };

      // Manually set the dialog ref before calling ngOnDestroy
      component['editProfileDialogRef'] =
        mockDialogRef as unknown as MatDialogRef<EditPersonalDetailsComponent>;

      component.ngOnDestroy();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should close profile pic dialog if open', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(false)), // Don't auto-close
        close: jest.fn(),
      };

      // Manually set the dialog ref before calling ngOnDestroy
      component['profilePicDialogRef'] =
        mockDialogRef as unknown as MatDialogRef<ProfilePicComponent>;

      component.ngOnDestroy();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should not throw error if no dialogs are open', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
