import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { ChangePasswordComponent } from './change-password.component';

interface ValidationErrors {
  required?: boolean;
  minlength?: boolean;
  pattern?: boolean;
}

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'changePassword',
      'isLoggedIn',
    ]);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [ChangePasswordComponent],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceSpy,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => 'token123',
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form invalid when empty', () => {
    expect(component.changePasswordForm.valid).toBeFalsy();
  });

  it('password field validity', () => {
    let errors: ValidationErrors = {};
    const password = component.changePasswordForm.controls['password'];
    errors = password.errors || {};
    expect(errors['required']).toBeTruthy();

    // Set password to something
    password.setValue('test');
    errors = password.errors || {};
    expect(errors['required']).toBeFalsy();
    expect(errors['minlength']).toBeTruthy();
    expect(errors['pattern']).toBeTruthy();

    // Set password to something valid
    password.setValue('Test@123');
    errors = password.errors || {};
    expect(errors['required']).toBeFalsy();
    expect(errors['minlength']).toBeFalsy();
    expect(errors['pattern']).toBeFalsy();
  });

  it('submitting a form emits a password', () => {
    expect(component.changePasswordForm.valid).toBeFalsy();
    component.changePasswordForm.controls['password'].setValue('Test@123');
    component.changePasswordForm.controls['confirmPassword'].setValue(
      'Test@123',
    );
    expect(component.changePasswordForm.valid).toBeTruthy();

    authService.changePassword.and.returnValue(of({}));

    component.onSubmit();

    expect(authService.changePassword.calls.count()).toBe(
      1,
      'spy method was called once',
    );
    expect(authService.changePassword.calls.mostRecent().args[1]).toBe(
      'Test@123',
      'service was called with form value',
    );
  });

  it('should handle password change error', () => {
    authService.changePassword.and.returnValue(
      throwError({ status: 400, error: { message: 'Token expired' } }),
    );

    component.changePasswordForm.controls['password'].setValue('Test@123');
    component.changePasswordForm.controls['confirmPassword'].setValue(
      'Test@123',
    );

    component.onSubmit();

    expect(component.seriousErrorMessage).toBe(
      'Your password reset link has expired. You need to request a new another reset email.',
    );
  });
});
