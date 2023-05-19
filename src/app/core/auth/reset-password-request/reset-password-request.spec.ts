import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { ResetPasswordRequestComponent } from './reset-password-request.component';

describe('ResetPasswordRequestComponent', () => {
  let component: ResetPasswordRequestComponent;
  let fixture: ComponentFixture<ResetPasswordRequestComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FormsModule],
      declarations: [ResetPasswordRequestComponent],
      providers: [AuthService],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordRequestComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email correctly', () => {
    expect(component.validateEmail('test@example.com')).toBeTrue();
    expect(component.validateEmail('invalid_email')).toBeFalse();
  });

  it('should validate inputs correctly', () => {
    component.email = 'test@example.com';
    component.validateInputs();

    expect(component.inputsValid).toBeTrue();
    expect(component.errorMessage).toBe('');

    component.email = 'invalid_email';
    component.validateInputs();

    expect(component.inputsValid).toBeFalse();
    expect(component.errorMessage).toBe('Invalid email format');
  });

  it('should handle password reset correctly', () => {
    spyOn(authService, 'resetPassword').and.returnValue(of(undefined));
    component.email = 'test@example.com';
    component.inputsValid = true;
    component.onPasswordReset();

    expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.successMessage).toBe(
      'Check your email and follow the instructions to reset your password.',
    );
    expect(component.errorMessage).toBe('');
  });

  it('should handle password reset error correctly', () => {
    spyOn(authService, 'resetPassword').and.returnValue(throwError({}));
    component.email = 'test@example.com';
    component.inputsValid = true;
    component.onPasswordReset();

    expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.errorMessage).toBe(
      'An error occurred while resetting the password',
    );
  });
});
