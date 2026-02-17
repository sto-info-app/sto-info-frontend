import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { MessageType } from '../../shared/models/lcars-message-type.enum';
import { VerifyEmailComponent } from './verify-email.component';

type VerifyEmailQueryParams = {
  token?: string;
};

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let httpMock: HttpTestingController;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let queryParamsSubject: Subject<VerifyEmailQueryParams>;

  beforeEach(async () => {
    routingServiceSpy = {
      getLink: jest.fn(),
    } as unknown as jest.Mocked<RoutingService>;
    queryParamsSubject = new Subject<VerifyEmailQueryParams>();

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        { provide: RoutingService, useValue: routingServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should set token from query params', () => {
      queryParamsSubject.next({ token: 'test-token' });
      expect(component.token).toBe('test-token');
      expect(component.message).toBe(''); // No error initially
    });

    it('should show error if token is missing', () => {
      queryParamsSubject.next({});
      expect(component.token).toBeUndefined();
      expect(component.message).toBe('Invalid token!');
      expect(component.messageType).toBe(MessageType.Error);
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      queryParamsSubject.next({ token: 'test-token' });
    });

    it('should handle success', () => {
      component.verifyEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_VERIFICATION_EMAIL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'test-token' });
      req.flush({});

      expect(component.message).toContain('Verification successful');
      expect(component.messageType).toBe(MessageType.Success);
      expect(component.showResendVerificationEmailButton).toBeFalse();
    });

    it('should handle status 0 error', () => {
      component.verifyEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_VERIFICATION_EMAIL);
      req.error(new ProgressEvent('error'), { status: 0 });

      expect(component.message).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      expect(component.messageType).toBe(MessageType.Error);
      expect(component.showResendVerificationEmailButton).toBeTrue();
    });

    it('should handle token expired error (400)', () => {
      component.verifyEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_VERIFICATION_EMAIL);
      req.flush(
        { message: 'Token expired' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(component.message).toBe('Your verification link has expired');
      expect(component.messageType).toBe(MessageType.Error);
      expect(component.showResendVerificationEmailButton).toBeTrue();
    });

    it('should handle generic error', () => {
      component.verifyEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_VERIFICATION_EMAIL);
      req.flush(
        { message: 'Error' },
        { status: 500, statusText: 'Server Error' },
      );

      expect(component.message).toBe('Verification failed. Please try again.');
      expect(component.messageType).toBe(MessageType.Error);
    });
  });

  describe('resendVerificationEmail', () => {
    beforeEach(() => {
      queryParamsSubject.next({ token: 'test-token' });
    });

    it('should handle success', () => {
      component.resendVerificationEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_RESEND_VERIFICATION_EMAIL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'test-token' });
      req.flush({});

      expect(component.message).toContain('Verification email sent');
      expect(component.messageType).toBe(MessageType.Info);
      expect(component.showResendVerificationEmailButton).toBeFalse();
    });

    it('should handle status 0 error', () => {
      component.resendVerificationEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_RESEND_VERIFICATION_EMAIL);
      req.error(new ProgressEvent('error'), { status: 0 });

      expect(component.message).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
      expect(component.messageType).toBe(MessageType.Error);
      expect(component.showResendVerificationEmailButton).toBeTrue();
    });

    it('should handle other error', () => {
      component.resendVerificationEmail();
      const req = httpMock.expectOne(API_URLS.AUTH_RESEND_VERIFICATION_EMAIL);
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });

      expect(component.message).toBe(
        'Failed to resend verification email. Please try again.',
      );
      expect(component.messageType).toBe(MessageType.Error);
      expect(component.showResendVerificationEmailButton).toBeTrue();
    });
  });

  describe('Helper Methods', () => {
    it('should get route link', () => {
      routingServiceSpy.getLink.mockReturnValue('/mock-link');
      expect(component.getRouteLink('some-route')).toBe('/mock-link');
    });
  });
});
