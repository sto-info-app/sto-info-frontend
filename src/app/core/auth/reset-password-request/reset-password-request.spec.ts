import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { ResetPasswordRequestComponent } from './reset-password-request.component';

describe('ResetPasswordRequestComponent', () => {
  let component: ResetPasswordRequestComponent;
  let fixture: ComponentFixture<ResetPasswordRequestComponent>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const authServiceSpy: jest.Mocked<AuthService> = {
      resetPassword: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    await TestBed.configureTestingModule({
      imports: [FormsModule, ResetPasswordRequestComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordRequestComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email correctly', () => {
    expect(component.validateEmail('test@example.com')).toBe(true);
    expect(component.validateEmail('invalid_email')).toBe(false);
  });

  it('should validate inputs correctly', () => {
    component.email = 'test@example.com';
    component.validateInputs();

    expect(component.inputsValid).toBe(true);
    expect(component.errorMessage).toBe('');

    component.email = 'invalid_email';
    component.validateInputs();

    expect(component.inputsValid).toBe(false);
    expect(component.errorMessage).toBe('Invalid email format');
  });

  it('should handle password reset correctly', () => {
    authService.resetPassword.mockReturnValue(of(undefined));
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
    const errorObject = { message: 'Some error occurred' };
    authService.resetPassword.mockReturnValue(throwError(() => errorObject));

    // Suppress console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    component.email = 'test@example.com';
    component.inputsValid = true;
    component.onPasswordReset();

    expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.errorMessage).toBe(errorObject.message);

    // Expect console.error to have been called with the correct arguments
    expect(console.error).toHaveBeenCalledWith('Login error:', errorObject);
  });
});
