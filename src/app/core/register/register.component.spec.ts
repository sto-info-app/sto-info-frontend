import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import {
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jest.Mocked<AuthService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let alertThemeServiceSpy: jest.Mocked<AlertThemeService>;
  let router: Router; // Use real router from TestingModule

  beforeEach(async () => {
    // Jest Mocks with Strict Typing
    authServiceSpy = {
      register: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    routingServiceSpy = {
      getLink: jest.fn(),
    } as unknown as jest.Mocked<RoutingService>;

    alertThemeServiceSpy = {
      applyAlertThemeThenApplyStaticTheme: jest.fn(),
      clearAlertStylesheet: jest.fn(),
      clearTimers: jest.fn(),
    } as unknown as jest.Mocked<AlertThemeService>;

    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        RouterTestingModule, // Provides Router, ActivatedRoute, etc.
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: AlertThemeService, useValue: alertThemeServiceSpy },
        // Do not provide Router manually
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate'); // Spy on the real router instance
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should be invalid when empty', () => {
      expect(component.registerForm.valid).toBe(false);
    });

    it('should validate required fields', () => {
      const controls = component.registerForm.controls;
      controls['firstName'].setValue('');
      controls['lastName'].setValue('');
      controls['username'].setValue('');
      controls['email'].setValue('');
      controls['password'].setValue('');
      controls['confirmPassword'].setValue('');

      expect(component.registerForm.valid).toBe(false);
      expect(controls['firstName'].errors?.['required']).toBeTruthy();
      expect(controls['lastName'].errors?.['required']).toBeTruthy();
      expect(controls['username'].errors?.['required']).toBeTruthy();
    });

    // Table-driven patterns
    const patternCases = [
      { control: 'email', value: 'invalid-email', error: 'pattern' },
      { control: 'username', value: 'user@name', error: 'pattern' },
      { control: 'password', value: 'weak', error: 'pattern' },
    ];

    test.each(patternCases)(
      'should validate pattern for $control',
      ({ control, value, error }) => {
        const ctrl = component.registerForm.controls[control];
        ctrl.setValue(value);
        expect(ctrl.errors?.[error]).toBeTruthy();
      },
    );

    it('should validate password match', () => {
      const controls = component.registerForm.controls;
      controls['password'].setValue('Password123!');
      controls['confirmPassword'].setValue('Password1234!');

      component.registerForm.updateValueAndValidity();

      expect(controls['confirmPassword'].errors?.['mustMatch']).toBeTruthy();
    });

    it('should be valid with correct data', () => {
      component.registerForm.patchValue({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(component.registerForm.valid).toBe(true);
    });
  });

  describe('Registration Submission', () => {
    beforeEach(() => {
      component.registerForm.patchValue({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should call register and navigate on success', () => {
      authServiceSpy.register.mockReturnValue(of({}));

      component.onRegister();

      expect(authServiceSpy.register).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/register/complete']);
    });

    const errorCases = [
      { status: 0, errorMsg: MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT },
      { status: 400, errorMsg: MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT },
    ];

    test.each(errorCases)(
      'should handle status $status',
      fakeAsync(
        ({ status, errorMsg }: { status: number; errorMsg: string }) => {
          authServiceSpy.register.mockReturnValue(
            throwError(() => ({ status })),
          );

          component.onRegister();
          expect(component.errorMessage).toBe(errorMsg);

          if (status === 0) {
            tick(component.showErrorMilliseconds);
            expect(component.errorMessage).toBe('');
          }
        },
      ),
    );

    it('should handle 409 Email conflict', () => {
      authServiceSpy.register.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Email already exists' },
        })),
      );

      component.onRegister();

      expect(
        component.registerForm.controls['email'].errors?.['uniqueEmail'],
      ).toBeTruthy();
    });

    it('should handle 409 Username conflict', () => {
      authServiceSpy.register.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Username already exists' },
        })),
      );

      component.onRegister();

      expect(
        component.registerForm.controls['username'].errors?.['uniqueUsername'],
      ).toBeTruthy();
    });

    it('should handle handle displayErrorMessage with no status', () => {
      component.displayErrorMessage('Critical');
      expect(
        alertThemeServiceSpy.applyAlertThemeThenApplyStaticTheme,
      ).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'red');
    });

    it('should handle 409 conflict that is not email or username', () => {
      authServiceSpy.register.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Other' },
        })),
      );
      component.onRegister();
      // Should not set specific control errors
      expect(component.registerForm.controls['email'].errors).toBeNull();
      expect(component.registerForm.controls['username'].errors).toBeNull();
    });

    it('should handle unknown error', () => {
      authServiceSpy.register.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      component.onRegister();

      expect(
        alertThemeServiceSpy.applyAlertThemeThenApplyStaticTheme,
      ).toHaveBeenCalled();
    });

    it('should return early if form is invalid', () => {
      component.registerForm.patchValue({ firstName: '' }); // Invalid form
      component.onRegister();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
      expect(component.isSubmitting).toBe(false);
    });

    it('should set mustMatch error on confirmPassword if form group has mustMatch error', () => {
      // Manually set error on group to trigger the branch (even if validator doesn't normally do it)
      component.registerForm.setErrors({ mustMatch: true });

      component.onRegister();

      expect(
        component.registerForm.controls['confirmPassword'].hasError(
          'mustMatch',
        ),
      ).toBe(true);
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('UI Helpers', () => {
    it('should get route link', () => {
      routingServiceSpy.getLink.mockReturnValue('/test-link');
      expect(component.getRouteLink('test')).toBe('/test-link');
    });
  });
});
