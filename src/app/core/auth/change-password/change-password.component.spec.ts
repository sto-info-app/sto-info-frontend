import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRoutingService: jest.Mocked<RoutingService>;
  let mockActivatedRoute: ActivatedRoute;

  beforeEach(async () => {
    mockAuthService = {
      changePassword: jest.fn(),
      isLoggedIn: jest.fn(),
      performLogout: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockRoutingService = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: jest.fn().mockReturnValue('mock-token'),
        },
      },
    } as unknown as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ChangePasswordComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoutingService, useValue: mockRoutingService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should get token from query params on init', () => {
    fixture.detectChanges();
    expect(component.token).toBe('mock-token');
    expect(component.seriousErrorMessage).toBe('');
  });

  it('should show serious error if token is missing on init', () => {
    (
      mockActivatedRoute.snapshot.queryParamMap.get as jest.Mock
    ).mockReturnValue(null);
    fixture.detectChanges();
    expect(component.token).toBe('');
    expect(component.seriousErrorMessage).toBe(
      'Invalid or missing token. Please request a new password reset.',
    );
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.changePasswordForm.patchValue({
        password: 'Password@123', // NOSONAR - Testing valid password format
        confirmPassword: 'Password@123', // NOSONAR - Testing password match validation
      });
    });

    it('should call changePassword and set success message on success', () => {
      mockAuthService.changePassword.mockReturnValue(of(undefined));
      mockAuthService.isLoggedIn.mockReturnValue(false);

      component.onSubmit();

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'mock-token',
        'Password@123',
      );
      expect(component.successMessage).toBe('Your password has been changed.');
    });

    it('should logout and show additional message if logged in after success', () => {
      mockAuthService.changePassword.mockReturnValue(of(undefined));
      mockAuthService.isLoggedIn.mockReturnValue(true);

      component.onSubmit();

      expect(mockAuthService.performLogout).toHaveBeenCalled();
      expect(component.successMessage).toContain(
        'You will need to login again.',
      );
    });

    it('should handle token expired error (400)', () => {
      mockAuthService.changePassword.mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'Token expired' },
        })),
      );

      component.onSubmit();

      expect(component.seriousErrorMessage).toContain('expired');
    });

    it('should handle generic error', fakeAsync(() => {
      mockAuthService.changePassword.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      component.onSubmit();

      expect(component.errorMessage).toContain('There was an error');

      tick(MILLISECONDS_SHOW_ERROR_MSG);
      expect(component.errorMessage).toBe('');
    }));

    it('should not call authService if form is invalid', () => {
      component.changePasswordForm.patchValue({ password: '' });
      component.onSubmit();
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });
  });

  it('should return route link', () => {
    expect(component.getRouteLink('test')).toBe('/mock-route');
  });

  describe('Form Validation', () => {
    it('should match passwords', () => {
      const form = component.changePasswordForm;
      form.patchValue({
        password: 'Password@123', // NOSONAR - Testing password match validation
        confirmPassword: 'Different@123', // NOSONAR - Testing password mismatch validation
      });
      expect(form.controls['confirmPassword'].hasError('mustMatch')).toBe(true);

      form.patchValue({ confirmPassword: 'Password@123' }); // NOSONAR - Testing password match validation
      expect(form.controls['confirmPassword'].hasError('mustMatch')).toBe(
        false,
      );
    });
  });
});
