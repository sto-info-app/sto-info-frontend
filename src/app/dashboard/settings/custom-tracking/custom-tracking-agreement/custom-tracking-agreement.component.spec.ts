import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import {
  CustomTrackingAgreement,
  CustomTrackingPolicyStatus,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingService } from '../custom-tracking.service';
import { CustomTrackingAgreementComponent } from './custom-tracking-agreement.component';

describe('CustomTrackingAgreementComponent', () => {
  const agreement: CustomTrackingAgreement = {
    version: '1.0',
    effectiveDate: '2026-09-04',
    updatedDate: '2026-09-04',
    title: 'Custom Tracking Content Agreement',
    sections: [
      {
        heading: null,
        paragraphs: ['You are responsible for everything you enter.'],
        bullets: [],
      },
      {
        heading: 'What you must not store or publish',
        paragraphs: ['You must not use custom tracking to store or publish:'],
        bullets: ['personal information;', 'illegal content;'],
      },
    ],
  };

  const accepted: CustomTrackingPolicyStatus = {
    currentVersion: '1.0',
    effectiveDate: '2026-09-04',
    updatedDate: '2026-09-04',
    acceptedVersion: '1.0',
    acceptedAt: '2026-09-04T10:00:00.000Z',
    acceptanceRequired: false,
  };

  let fixture: ComponentFixture<CustomTrackingAgreementComponent>;
  let component: CustomTrackingAgreementComponent;
  let getAgreement: jest.Mock<Observable<CustomTrackingAgreement>, []>;
  let acceptPolicy: jest.Mock<Observable<CustomTrackingPolicyStatus>, [string]>;

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingAgreementComponent, RouterModule.forRoot([])],
      providers: [
        {
          provide: CustomTrackingService,
          useValue: { getAgreement, acceptPolicy },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomTrackingAgreementComponent);
    component = fixture.componentInstance;
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    getAgreement = jest.fn().mockReturnValue(of(agreement));
    acceptPolicy = jest.fn().mockReturnValue(of(accepted));
  });

  it('shows the agreement it was given', async () => {
    await build();
    fixture.detectChanges();

    expect(text()).toContain('Custom Tracking Content Agreement');
    expect(text()).toContain('You are responsible for everything you enter.');
    expect(text()).toContain('personal information;');
  });

  it('shows the version and the date it took effect', async () => {
    await build();
    fixture.detectChanges();

    expect(text()).toContain('Version 1.0');
    expect(text()).toContain('4 September 2026');
  });

  // Presetting it would turn an agreement into a formality nobody read.
  it('leaves the tick box clear and the button disabled', async () => {
    await build();
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector(
      '#custom-tracking-agreed',
    );
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );

    expect(checkbox.checked).toBe(false);
    expect(button.disabled).toBe(true);
  });

  // Ticked the way a user ticks it. The component is OnPush, so a programmatic
  // value change would leave the button stale in the test while behaving
  // correctly in a browser — testing the real interaction avoids asserting
  // something that is only true of the test.
  it('enables acceptance once the box is ticked', async () => {
    await build();
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector(
      '#custom-tracking-agreed',
    );

    checkbox.click();
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );

    expect(component.agreementForm.value.agreed).toBe(true);
    expect(button.disabled).toBe(false);
  });

  // The server refuses a stale version, but sending the one actually shown is
  // what makes the record say what the user read.
  it('sends the version it displayed', async () => {
    await build();
    fixture.detectChanges();

    component.agreementForm.controls.agreed.setValue(true);
    component.accept();

    expect(acceptPolicy).toHaveBeenCalledWith('1.0');
  });

  it('reports the acceptance to its parent', async () => {
    await build();
    fixture.detectChanges();

    const emitted: CustomTrackingPolicyStatus[] = [];
    component.accepted.subscribe(status => emitted.push(status));

    component.agreementForm.controls.agreed.setValue(true);
    component.accept();

    expect(emitted).toEqual([accepted]);
  });

  it('does nothing while the box is clear', async () => {
    await build();
    fixture.detectChanges();

    component.accept();

    expect(acceptPolicy).not.toHaveBeenCalled();
  });

  it('does not accept twice while one is in flight', async () => {
    await build();
    fixture.detectChanges();

    component.agreementForm.controls.agreed.setValue(true);
    component.isSaving = true;
    component.accept();

    expect(acceptPolicy).not.toHaveBeenCalled();
  });

  // Somebody asked again deserves to know their data is untouched and only
  // editing is paused.
  it('says what has changed when asking again', async () => {
    await build();
    component.status = {
      ...accepted,
      acceptedVersion: '0.9',
      acceptanceRequired: true,
    };
    fixture.detectChanges();

    expect(component.isReacceptance).toBe(true);
    expect(text()).toContain('still here and still readable');
  });

  it('says nothing about changes on a first acceptance', async () => {
    await build();
    component.status = {
      ...accepted,
      acceptedVersion: null,
      acceptanceRequired: true,
    };
    fixture.detectChanges();

    expect(component.isReacceptance).toBe(false);
    expect(text()).not.toContain('still here and still readable');
  });

  it('reports a failure to load the wording', async () => {
    getAgreement.mockReturnValue(throwError(() => new Error('offline')));

    await build();
    fixture.detectChanges();

    expect(text()).toContain('Unable to load the content agreement.');
  });

  // The likeliest cause is the wording changing while the page was open, and
  // reloading is the remedy either way.
  it('tells the user to read it again when acceptance fails', async () => {
    acceptPolicy.mockReturnValue(throwError(() => new Error('conflict')));

    await build();
    fixture.detectChanges();

    component.agreementForm.controls.agreed.setValue(true);
    component.accept();
    fixture.detectChanges();

    expect(text()).toContain('read the agreement again');
    expect(component.isSaving).toBe(false);
  });
});
