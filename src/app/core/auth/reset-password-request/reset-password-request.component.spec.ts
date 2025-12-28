import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth.service';
import { ResetPasswordRequestComponent } from './reset-password-request.component';

describe('ResetPasswordRequestComponent', () => {
  let component: ResetPasswordRequestComponent;
  let fixture: ComponentFixture<ResetPasswordRequestComponent>;
  let authServiceSpy: any;
  let routingServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      resetPassword: jest.fn(),
    };
    routingServiceSpy = {
      getLink: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        ResetPasswordRequestComponent,
        FormsModule,
        NoopAnimationsModule,
      ], // Standalone
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
      expect(component.errorMessage).toBe('Invalid email format');
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
      const error = { message: 'Server error' };
      authServiceSpy.resetPassword.mockReturnValue(throwError(() => error));

      spyOn(console, 'error'); // Suppress console error

      component.onPasswordReset();

      expect(component.errorMessage).toBe('Server error');
    });

    it('should handle generic error', () => {
      component.email = 'test@example.com';
      component.inputsValid = true;
      authServiceSpy.resetPassword.mockReturnValue(
        throwError(() => 'Unknown error'),
      );

      spyOn(console, 'error');

      component.onPasswordReset();

      expect(component.errorMessage).toBe(
        'An error occurred while resetting the password',
      );
    });
  });

  describe('Helpers', () => {
    it('should get route link', () => {
      routingServiceSpy.getLink.mockReturnValue('/home');
      expect(component.getRouteLink('home')).toBe('/home');
    });
  });
});
