import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { MessageType } from 'src/app/shared/models/lcars-message-type.enum';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';
import { VerifyEmailComponent } from './verify-email.component';

interface QueryParams {
  token?: string;
}

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let httpTestingController: HttpTestingController;
  let queryParamsSubject: Subject<QueryParams>;
  let authService: jasmine.SpyObj<AuthService>;
  let route: ActivatedRoute;

  beforeEach(async () => {
    queryParamsSubject = new Subject();

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['verify']);

    await TestBed.configureTestingModule({
      imports: [
        VerifyEmailComponent,
        LcarsErrorMessageComponent,
        RouterModule.forRoot([]),
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    route = TestBed.inject(ActivatedRoute);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify(); // Verifies that no requests are outstanding.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have token from queryParams', done => {
    queryParamsSubject.next({ token: 'access_token' });
    fixture.detectChanges();

    expect(component.token).toBe('access_token');
    done();
  });

  it('should verify email successfully', () => {
    component.verifyEmail();

    const req = httpTestingController.expectOne(
      `${environment.apiUrl}/auth/verify-email`,
    );
    expect(req.request.method).toEqual('POST');

    req.flush({});

    expect(component.message).toBe(
      'Verification successful! You can now login.',
    );
    expect(component.messageType).toBe(MessageType.Success);
    expect(component.showResendVerificationEmailButton).toBe(false);
  });

  //NOTE: Add more tests for error cases and resendVerificationEmail - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components
});
