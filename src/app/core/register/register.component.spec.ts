import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import {
  MAX_CHARS_NAMES,
  MAX_CHARS_USERNAME,
} from 'src/app/shared/constants/forms.constants';
import { AuthService } from '../auth/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'register/complete', component: DummyComponent },
        ]),
        HttpClientTestingModule,
      ],
      declarations: [RegisterComponent, DummyComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: () => of({}),
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('form invalid when empty', () => {
    expect(component.registerForm.valid).toBeFalsy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show errors if fields are empty', () => {
    const firstNameControl = component.registerForm.controls['firstName'];
    const lastNameControl = component.registerForm.controls['lastName'];
    const usernameControl = component.registerForm.controls['username'];
    const emailControl = component.registerForm.controls['email'];
    const passwordControl = component.registerForm.controls['password'];
    const confirmPasswordControl =
      component.registerForm.controls['confirmPassword'];

    firstNameControl.markAsTouched();
    lastNameControl.markAsTouched();
    usernameControl.markAsTouched();
    emailControl.markAsTouched();
    passwordControl.markAsTouched();
    confirmPasswordControl.markAsTouched();

    fixture.detectChanges();

    expect(firstNameControl.errors?.['required']).toBeTruthy();
    expect(lastNameControl.errors?.['required']).toBeTruthy();
    expect(usernameControl.errors?.['required']).toBeTruthy();
    expect(emailControl.errors?.['required']).toBeTruthy();
    expect(passwordControl.errors?.['required']).toBeTruthy();
    expect(confirmPasswordControl.errors?.['required']).toBeTruthy();
  });

  it('should show errors if fields are invalid', async () => {
    const firstNameControl = component.registerForm.controls['firstName'];
    const lastNameControl = component.registerForm.controls['lastName'];
    const usernameControl = component.registerForm.controls['username'];
    const emailControl = component.registerForm.controls['email'];
    const passwordControl = component.registerForm.controls['password'];
    const confirmPasswordControl =
      component.registerForm.controls['confirmPassword'];

    await firstNameControl.setValue('a'.repeat(MAX_CHARS_NAMES + 1));
    await lastNameControl.setValue('a'.repeat(MAX_CHARS_NAMES + 1));
    await usernameControl.setValue('a'.repeat(MAX_CHARS_USERNAME + 1));
    await emailControl.setValue('not an email');
    await passwordControl.setValue('short');
    await confirmPasswordControl.setValue('D1fferent!');

    firstNameControl.updateValueAndValidity();
    lastNameControl.updateValueAndValidity();
    usernameControl.updateValueAndValidity();
    emailControl.updateValueAndValidity();
    passwordControl.updateValueAndValidity();
    confirmPasswordControl.updateValueAndValidity();

    firstNameControl.markAsDirty();
    lastNameControl.markAsDirty();
    usernameControl.markAsDirty();
    emailControl.markAsDirty();
    passwordControl.markAsDirty();
    confirmPasswordControl.markAsDirty();

    firstNameControl.markAsTouched();
    lastNameControl.markAsTouched();
    usernameControl.markAsTouched();
    emailControl.markAsTouched();
    passwordControl.markAsTouched();
    confirmPasswordControl.markAsTouched();

    // await fixture.whenStable();
    await fixture.whenRenderingDone();
    fixture.detectChanges();

    // Check that the form controls have the right errors
    expect(firstNameControl.errors?.['maxlength']).toBeTruthy();
    expect(lastNameControl.errors?.['maxlength']).toBeTruthy();
    expect(usernameControl.errors?.['maxlength']).toBeTruthy();
    expect(emailControl.errors?.['pattern']).toBeTruthy();
    expect(passwordControl.errors?.['minlength']).toBeTruthy();
    expect(confirmPasswordControl.errors?.['mustMatch']).toBeTruthy();

    // Check if the error messages are correctly displayed in the template
    const firstNameErrorElement = fixture.debugElement.query(
      By.css('#firstName-invalid-feedback .helper-error-text'),
    );
    expect(firstNameErrorElement).toBeTruthy();
    expect(firstNameErrorElement.nativeElement.textContent).toContain(
      component.errorTextNamesMaxLength,
    );

    const lastNameErrorElement = fixture.debugElement.query(
      By.css('#lastName-invalid-feedback .helper-error-text'),
    );
    expect(lastNameErrorElement).toBeTruthy();
    expect(lastNameErrorElement.nativeElement.textContent).toContain(
      component.errorTextNamesMaxLength,
    );

    const usernameErrorElement = fixture.debugElement.query(
      By.css('#username-invalid-feedback .helper-error-text'),
    );
    expect(usernameErrorElement).toBeTruthy();
    expect(usernameErrorElement.nativeElement.textContent).toContain(
      component.errorTextUsernameMaxLength,
    );

    const emailErrorElement = fixture.debugElement.query(
      By.css('#email-invalid-feedback .helper-error-text'),
    );
    expect(emailErrorElement).toBeTruthy();
    expect(emailErrorElement.nativeElement.textContent).toContain(
      component.errorTextEmailInvalidFormat,
    );

    const passwordErrorElement = fixture.debugElement.query(
      By.css('#password-invalid-feedback .helper-error-text'),
    );
    expect(passwordErrorElement).toBeTruthy();
    expect(passwordErrorElement.nativeElement.textContent).toContain(
      component.errorTextPasswordMinLength,
    );

    const confirmPasswordErrorElement = fixture.debugElement.query(
      By.css('#confirmPassword-invalid-feedback .helper-error-text'),
    );
    expect(confirmPasswordErrorElement).toBeTruthy();
    expect(confirmPasswordErrorElement.nativeElement.textContent).toContain(
      component.errorTextPasswordsDoNotMatch,
    );
  });

  it('should call authService.register when the form is submitted', () => {
    spyOn(authService, 'register').and.returnValue(of({}));

    // Fill in the form inputs
    component.registerForm.controls['firstName'].setValue('Test');
    component.registerForm.controls['lastName'].setValue('User');
    component.registerForm.controls['username'].setValue('testuser');
    component.registerForm.controls['email'].setValue('test@example.com');
    component.registerForm.controls['password'].setValue('Password123!');
    component.registerForm.controls['confirmPassword'].setValue('Password123!');

    component.onRegister();

    expect(authService.register).toHaveBeenCalled();
  });

  it('should navigate to /register/complete when the form is submitted successfully', done => {
    spyOn(authService, 'register').and.returnValue(of({}));
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    // Fill in the form inputs
    component.registerForm.controls['firstName'].setValue('Test');
    component.registerForm.controls['lastName'].setValue('User');
    component.registerForm.controls['username'].setValue('testuser');
    component.registerForm.controls['email'].setValue('test@example.com');
    component.registerForm.controls['password'].setValue('Password123!');
    component.registerForm.controls['confirmPassword'].setValue('Password123!');

    component.onRegister();

    fixture.whenStable().then(() => {
      expect(authService.register).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/register/complete']);
      done();
    });
  });
});

@Component({ template: '' })
class DummyComponent {}
