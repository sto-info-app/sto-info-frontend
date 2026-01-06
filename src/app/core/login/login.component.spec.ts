import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Event, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { LoginResponse } from 'src/app/models/user-auth.models';
import {
  MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SharedDataService } from 'src/app/shared/services/shared-data.service';
import { AuthService } from '../auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jest.Mocked<AuthService>;
  let sharedDataServiceSpy: jest.Mocked<SharedDataService>;
  let alertThemeServiceSpy: jest.Mocked<AlertThemeService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  // Router needs special handling because it has properties (events) and methods
  let routerSpy: Partial<jest.Mocked<Router>> & { events: Subject<Event> };

  beforeEach(async () => {
    // Correct Jest Mocks
    authServiceSpy = {
      login: jest.fn(),
      saveToken: jest.fn(),
      // Add other methods if component calls them
    } as unknown as jest.Mocked<AuthService>;

    sharedDataServiceSpy = {
      updateUserId: jest.fn(),
    } as unknown as jest.Mocked<SharedDataService>;

    alertThemeServiceSpy = {
      applyAlertThemeThenClearAfterAShortTime: jest.fn(),
      clearAlertStylesheet: jest.fn(),
      clearTimers: jest.fn(),
    } as unknown as jest.Mocked<AlertThemeService>;

    routingServiceSpy = {
      getLink: jest.fn(),
    } as unknown as jest.Mocked<RoutingService>;

    routerSpy = {
      navigate: jest.fn(),
      events: new Subject<Event>(),
      // Add other properties/methods if needed
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SharedDataService, useValue: sharedDataServiceSpy },
        { provide: AlertThemeService, useValue: alertThemeServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: jest.fn((key: string) =>
                  key === 'returnUrl' ? '/dashboard' : null,
                ),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should be invalid initially', () => {
      component.validateInputs();
      expect(component.inputsValid).toBe(false);
    });

    it('should be valid with correct email and password', () => {
      component.email = 'test@example.com';
      component.password = 'password123';
      component.validateInputs();
      expect(component.inputsValid).toBe(true);
    });

    // Table-driven test for invalid inputs
    const invalidInputs = [
      {
        email: 'invalid-email',
        password: 'password123',
        desc: 'invalid email format',
      },
      { email: 'test@example.com', password: '', desc: 'empty password' },
      { email: '', password: 'password123', desc: 'empty email' },
    ];

    test.each(invalidInputs)(
      'should be invalid with $desc',
      ({ email, password }) => {
        component.email = email;
        component.password = password;
        component.validateInputs();
        expect(component.inputsValid).toBe(false);
      },
    );
  });

  describe('Login', () => {
    it('should not attempt login if inputs are invalid', () => {
      component.inputsValid = false;
      component.onLogin();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should handle successful login', () => {
      const mockResponse: LoginResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        expires_in: 3600,
        user_id: 'user123',
      };
      authServiceSpy.login.mockReturnValue(of(mockResponse));
      component.inputsValid = true;
      component.email = 'test@example.com';
      component.password = 'pass';

      component.onLogin();

      expect(authServiceSpy.saveToken).toHaveBeenCalledWith(
        'access123',
        'refresh123',
        3600,
      );
      expect(sharedDataServiceSpy.updateUserId).toHaveBeenCalledWith('user123');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      component.inputsValid = true;
      component.showErrorMilliseconds = 1000;
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error
    });

    const errorCases = [
      {
        status: 0,
        errorResp: { status: 0 },
        expectedMsg: MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
      },
      {
        status: 401,
        errorResp: { status: 401, error: { message: 'Email not verified' } },
        expectedMsg: MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT,
      },
      {
        status: 401,
        errorResp: { status: 401, error: { message: 'Other' } },
        expectedMsg: MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT,
      },
      {
        status: 408,
        errorResp: { status: 408 },
        expectedMsg: 'timed out', // Partial match
      },
      {
        status: 500,
        errorResp: { status: 500, error: { message: 'Server boom' } },
        expectedMsg: 'Server boom',
      },
    ];

    test.each(errorCases)(
      'should handle status $status',
      ({ errorResp, expectedMsg }) => {
        const error = new HttpErrorResponse(errorResp);
        authServiceSpy.login.mockReturnValue(throwError(() => error));

        component.onLogin();

        if (expectedMsg === 'timed out') {
          expect(component.errorMessage).toContain(expectedMsg);
        } else {
          expect(component.errorMessage).toBe(expectedMsg);
        }

        if (errorResp.status === 0) {
          expect(
            alertThemeServiceSpy.applyAlertThemeThenClearAfterAShortTime,
          ).toHaveBeenCalled();
        }
      },
    );

    it('should clear error message after timeout', fakeAsync(() => {
      const error = new HttpErrorResponse({
        status: 500,
        error: { message: 'Error' },
      });
      authServiceSpy.login.mockReturnValue(throwError(() => error));

      component.onLogin();
      expect(component.errorMessage).toBe('Error');

      tick(1001); // Wait for timeout
      expect(component.errorMessage).toBe('');
    }));

    it('should handle default error with no message', () => {
      const error = new HttpErrorResponse({ status: 501 });
      authServiceSpy.login.mockReturnValue(throwError(() => error));
      component.onLogin();
      expect(component.errorMessage).toBe('Unknown error!');
    });

    it('should navigate to default home if no returnUrl', () => {
      // Mock ActivatedRoute to return null for returnUrl
      (
        TestBed.inject(ActivatedRoute).snapshot.queryParamMap.get as jest.Mock
      ).mockReturnValue(null);

      const mockResponse: LoginResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        expires_in: 3600,
        user_id: 'user123',
      };
      authServiceSpy.login.mockReturnValue(of(mockResponse));
      component.onLogin();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should apply red state if httpStatus is not provided to displayErrorMessage', () => {
      component.displayErrorMessage('Critical Error');
      expect(
        alertThemeServiceSpy.applyAlertThemeThenClearAfterAShortTime,
      ).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'red');
    });
  });

  describe('Helper Methods', () => {
    it('should get route link', () => {
      routingServiceSpy.getLink.mockReturnValue('/mock-link');
      expect(component.getRouteLink('some-route')).toBe('/mock-link');
    });
  });

  describe('Lifecycle', () => {
    it('should clear alerts and timers on destroy', () => {
      component.ngOnDestroy();
      expect(alertThemeServiceSpy.clearAlertStylesheet).toHaveBeenCalled();
      expect(alertThemeServiceSpy.clearTimers).toHaveBeenCalled();
    });
  });
});
