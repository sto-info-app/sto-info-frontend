import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { AuthService } from '../auth.service';
import { ResetPasswordRequestComponent } from './reset-password-request.component';

describe('ResetPasswordRequestComponent', () => {
  let component: ResetPasswordRequestComponent;
  let fixture: ComponentFixture<ResetPasswordRequestComponent>;
  let authServiceSpy: {
    resetPassword: jest.Mock;
    isLoggedIn: jest.Mock;
  };
  let routingServiceSpy: {
    getLink: jest.Mock;
  };
  let privacyModeServiceSpy: {
    load: jest.Mock;
    isEnabled: jest.Mock;
  };

  beforeEach(async () => {
    authServiceSpy = {
      resetPassword: jest.fn(),
      isLoggedIn: jest.fn().mockReturnValue(false),
    };
    routingServiceSpy = {
      getLink: jest.fn(),
    };
    privacyModeServiceSpy = {
      load: jest.fn().mockReturnValue(of({ privacyMode: false })),
      isEnabled: jest.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordRequestComponent, FormsModule], // Standalone
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: PrivacyModeService, useValue: privacyModeServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Validation', () => {
    it('should validate correct email', () => {
      component.email = 'test@example.com';
      component.validateInputs();
      expect(component.inputsValid).toBeTrue();
      expect(component.errorMessage).toBe('');
    });

    it('should invalidate incorrect email', () => {
      component.email = 'invalid-email';
      component.validateInputs();
      expect(component.inputsValid).toBeFalse();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Password Reset', () => {
    it('should not call service if inputs invalid', () => {
      component.inputsValid = false;
      component.onPasswordReset();
      expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
    });

    it('should call resetPassword and show success message', () => {
      component.email = 'test@example.com';
      component.inputsValid = true;
      authServiceSpy.resetPassword.mockReturnValue(of(void 0));

      component.onPasswordReset();

      expect(authServiceSpy.resetPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(component.successMessage).toContain('Check your email');
      expect(component.errorMessage).toBe('');
    });

    it('should handle error with message property', () => {
      component.email = 'test@example.com';
      component.inputsValid = true;
      const error = { error: { message: 'Server error' } };
      authServiceSpy.resetPassword.mockReturnValue(throwError(() => error));

      component.onPasswordReset();

      expect(component.errorMessage).toBe('Server error');
    });

    it('should handle generic error', () => {
      component.email = 'test@example.com';
      component.inputsValid = true;
      authServiceSpy.resetPassword.mockReturnValue(
        throwError(() => 'Unknown error'),
      );

      component.onPasswordReset();

      expect(component.errorMessage).toBe(
        'An error occurred while resetting the password. Please try again.',
      );
    });
  });

  describe('Helpers', () => {
    it('should get route link', () => {
      routingServiceSpy.getLink.mockReturnValue('/home');
      expect(component.getRouteLink('home')).toBe('/home');
    });

    it('should have precomputed navigation links', () => {
      expect(component.dashboardLink).toBe('/dashboard');
      expect(component.accountsLink).toBe('/dashboard/accounts');
      expect(component.loginLink).toBe('/login');
      expect(component.registerLink).toBe('/register');
    });

    it('should update isEmailValid when validateInputs is called', () => {
      component.email = 'test@example.com';
      component.validateInputs();
      expect(component.isEmailValid).toBe(true);

      component.email = 'not-valid';
      component.validateInputs();
      expect(component.isEmailValid).toBe(false);
    });
  });

  describe('Auxiliary navigation', () => {
    it('should render Login and Register links when not logged in', () => {
      authServiceSpy.isLoggedIn.mockReturnValue(false);
      fixture.detectChanges();
      const links = fixture.nativeElement.querySelectorAll('.buttons a');
      const texts = Array.from<Element>(links).map(el =>
        el.textContent?.trim(),
      );
      expect(texts).toContain('Login');
      expect(texts).toContain('Register');
    });

    it('should render Dashboard and Accounts links when logged in', () => {
      authServiceSpy.isLoggedIn.mockReturnValue(true);
      fixture.detectChanges();
      const links = fixture.nativeElement.querySelectorAll('.buttons a');
      const texts = Array.from<Element>(links).map(el =>
        el.textContent?.trim(),
      );
      expect(texts).toContain('Dashboard');
      expect(texts).toContain('Accounts');
    });
  });

  describe('Privacy mode', () => {
    it('should not load privacy settings when logged out', () => {
      expect(privacyModeServiceSpy.load).not.toHaveBeenCalled();
    });

    it('should load privacy settings when logged in', () => {
      authServiceSpy.isLoggedIn.mockReturnValue(true);

      const loggedInFixture = TestBed.createComponent(
        ResetPasswordRequestComponent,
      );
      loggedInFixture.detectChanges();

      expect(privacyModeServiceSpy.load).toHaveBeenCalled();
    });
  });
});
