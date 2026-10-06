import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import {
  FLEET_FEATURES_DISABLED,
  FleetFeatureState,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { FLEET_CONFIGURATION } from 'src/app/shared/services/fleet-configuration.testing';

import { ContactComponent } from './contact.component';
import {
  CONTACT_TOPICS,
  contactTopicsFor,
  FLEET_CONTACT_TOPIC,
} from './contact.constants';
import { ContactTopic } from './models/contact-form.models';

const feedbackTopic: ContactTopic = 'feedback';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;
  let httpMock: HttpTestingController;
  let fleetFeatures: BehaviorSubject<FleetFeatureState>;

  beforeEach(async () => {
    fleetFeatures = new BehaviorSubject<FleetFeatureState>(
      FLEET_FEATURES_DISABLED,
    );
    await TestBed.configureTestingModule({
      imports: [ContactComponent, HttpClientTestingModule],
      providers: [
        {
          provide: FleetConfigurationService,
          useValue: { getFeatures: () => fleetFeatures },
        },
      ],
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

  /**
   * The topics the select offers, as a reader sees them.
   *
   * @returns Their labels, after the placeholder.
   */
  const offered = (): string[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '#contactTopic option:not([disabled])',
      ),
    ).map(option => option.textContent?.trim() ?? '');

  // Steve's decision of 6 October 2026 (FC-045).
  it('offers no Fleet Communities topic while Fleet is off', () => {
    expect(offered()).toEqual(CONTACT_TOPICS.map(topic => topic.label));
    expect(offered()).not.toContain('Fleet Communities');
  });

  it('offers Fleet Communities, before Other, once Fleet is on', () => {
    fleetFeatures.next(FLEET_CONFIGURATION.features);
    fixture.detectChanges();

    expect(offered()).toEqual([
      'Become a volunteer',
      'Become a developer',
      'Feedback',
      'Question',
      'Fleet Communities',
      'Other',
    ]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLOptionElement>(
        'option[value="fleet"]',
      ),
    ).not.toBeNull();
  });

  it('builds the topics for each position of the switch', () => {
    expect(contactTopicsFor(false)).toBe(CONTACT_TOPICS);
    expect(contactTopicsFor(true)).toEqual([
      ...CONTACT_TOPICS.slice(0, -1),
      FLEET_CONTACT_TOPIC,
      CONTACT_TOPICS[CONTACT_TOPICS.length - 1],
    ]);
    expect(FLEET_CONTACT_TOPIC).toEqual({
      value: 'fleet',
      label: 'Fleet Communities',
    });
  });

  it('sends the Fleet Communities topic as fleet', () => {
    fleetFeatures.next(FLEET_CONFIGURATION.features);
    fixture.detectChanges();
    component.contactForm.setValue({
      name: 'Jean-Luc Picard',
      email: 'picard@enterprise.com',
      topic: 'fleet',
      message: 'How do I register my Fleet?',
    });

    component.onSubmit();

    const req = httpMock.expectOne(API_URLS.CONTACT);

    expect(req.request.body).toEqual(
      expect.objectContaining({ topic: 'fleet' }),
    );
    req.flush({ id: '1', status: 'received', receivedAt: 'now' });
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
      topic: feedbackTopic,
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
      topic: feedbackTopic,
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
      topic: feedbackTopic,
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
      topic: feedbackTopic,
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
