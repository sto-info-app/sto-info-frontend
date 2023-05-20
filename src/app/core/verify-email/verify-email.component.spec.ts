import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { MessageType } from 'src/app/shared/models/lcars-message-type.enum';
import { environment } from 'src/environments/environment';
import { VerifyEmailComponent } from './verify-email.component';

interface QueryParams {
  token?: string;
}

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let httpTestingController: HttpTestingController;
  let queryParamsSubject: Subject<QueryParams>;

  beforeEach(async () => {
    queryParamsSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [VerifyEmailComponent, LcarsErrorMessageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
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

    setTimeout(() => {
      expect(component.token).toBe('access_token');
      done();
    });
  });

  it('should show error message if token is missing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [VerifyEmailComponent, LcarsErrorMessageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of(convertToParamMap({})),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.message).toBe('Invalid token!');
    expect(component.messageType).toBe(MessageType.Error);
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

  //TODO: Add more tests for error cases and resendVerificationEmail
});
