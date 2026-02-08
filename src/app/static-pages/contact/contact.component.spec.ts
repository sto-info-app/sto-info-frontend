import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark the form touched when invalid', () => {
    component.onSubmit();

    expect(component.formControls.name.touched).toBe(true);
    expect(component.isSubmitting).toBe(false);
  });

  it('should submit and reset on success', () => {
    component.contactForm.setValue({
      name: 'Jean-Luc Picard',
      email: 'picard@enterprise.com',
      topic: 'feedback',
      message: 'Tea. Earl Grey. Hot.',
    });

    component.onSubmit();

    const req = httpMock.expectOne(API_URLS.CONTACT);
    expect(req.request.method).toBe('POST');
    req.flush({
      id: '1',
      status: 'received',
      receivedAt: '2026-02-08T00:00:00Z',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toContain('Thanks for reaching out');
    expect(component.contactForm.value).toEqual({
      name: '',
      email: '',
      topic: '',
      message: '',
    });
  });

  it('should set a friendly error for network failures', () => {
    component.contactForm.setValue({
      name: 'Jean-Luc Picard',
      email: 'picard@enterprise.com',
      topic: 'feedback',
      message: 'Tea. Earl Grey. Hot.',
    });

    component.onSubmit();

    const req = httpMock.expectOne(API_URLS.CONTACT);
    req.error(new ErrorEvent('NetworkError'), { status: 0 });

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toBeTruthy();
  });

  it('should set a validation error for bad requests', () => {
    component.contactForm.setValue({
      name: 'Jean-Luc Picard',
      email: 'picard@enterprise.com',
      topic: 'feedback',
      message: 'Tea. Earl Grey. Hot.',
    });

    component.onSubmit();

    const req = httpMock.expectOne(API_URLS.CONTACT);
    req.error(new ErrorEvent('BadRequest'), { status: 400 });

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toBeTruthy();
  });

  it('should set a default error for other failures', () => {
    component.contactForm.setValue({
      name: 'Jean-Luc Picard',
      email: 'picard@enterprise.com',
      topic: 'feedback',
      message: 'Tea. Earl Grey. Hot.',
    });

    component.onSubmit();

    const req = httpMock.expectOne(API_URLS.CONTACT);
    req.error(new ErrorEvent('ServerError'), { status: 500 });

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toBe(
      'Unable to send your message right now. Please try again soon.',
    );
  });
});
