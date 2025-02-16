import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginResponse } from 'src/app/models/user-auth.models';
import { AuthService } from '../auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [RouterTestingModule, FormsModule, BrowserAnimationsModule],
      providers: [
        AuthService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
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
    component.password = 'testpassword';
    component.validateInputs();

    expect(component.inputsValid).toBeTrue();

    component.email = 'invalid_email';
    component.password = '';
    component.validateInputs();

    expect(component.inputsValid).toBeFalse();
  });

  it('should handle login error correctly', fakeAsync(() => {
    const mockErrorResponse = new HttpErrorResponse({
      error: { message: 'Unauthorised: Invalid email or password.' },
      status: 401,
    });
    spyOn(authService, 'login').and.returnValue(throwError(mockErrorResponse));
    spyOn(component, 'displayErrorMessage');

    component.email = 'test@example.com';
    component.password = 'testpassword';
    component.inputsValid = true; // Set inputsValid to true
    component.onLogin();

    tick();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'testpassword',
    });
    expect(component.displayErrorMessage).toHaveBeenCalledWith(
      'Unauthorised: Invalid email or password.',
    );
  }));

  it('should handle login correctly', fakeAsync(() => {
    const expectedExpiration = 1687002446481507;
    const mockLoginResponse: LoginResponse = {
      access_token: 'test_token',
      refresh_token: 'test_refresh_token',
      expires_in: expectedExpiration,
    };
    spyOn(authService, 'login').and.returnValue(of(mockLoginResponse));
    spyOn(authService, 'saveToken');
    spyOn(router, 'navigate');

    component.email = 'test@example.com';
    component.password = 'testpassword';
    component.inputsValid = true; // Set inputsValid to true
    component.onLogin();

    tick();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'testpassword',
    });
    expect(authService.saveToken).toHaveBeenCalledWith(
      'test_token',
      'test_refresh_token',
      expectedExpiration,
    );
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));
});
//NOTE: Should update to the correct route from constants
