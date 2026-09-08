import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
} from 'src/app/shared/constants/feature-availability.constants';

import { FeatureUnavailableComponent } from './feature-unavailable.component';

describe('FeatureUnavailableComponent', () => {
  let fixture: ComponentFixture<FeatureUnavailableComponent>;
  let component: FeatureUnavailableComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureUnavailableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureUnavailableComponent);
    component = fixture.componentInstance;
    component.featureName = 'Storytime';
  });

  // The one thing the notice must never do is imply the visitor's own records
  // are gone because the site could not be reached.
  it('says the systems are not answering when the backend is offline', () => {
    component.reason = FEATURE_UNAVAILABLE_OFFLINE;

    fixture.detectChanges();

    expect(text()).toContain('Connection Lost');
    expect(text()).toContain('Storytime cannot be reached');
    expect(text()).toContain('systems are not answering');
  });

  it('says the feature is switched off, and that nothing is lost', () => {
    component.reason = FEATURE_UNAVAILABLE_DISABLED;

    fixture.detectChanges();

    expect(text()).toContain('Currently Offline');
    expect(text()).toContain('Storytime is switched off at the moment');
    expect(text()).toContain('untouched');
  });

  // Neither situation is the visitor's doing, so it is announced rather than
  // alerted: a status region is read out without interrupting them.
  it('announces the notice politely', () => {
    component.reason = FEATURE_UNAVAILABLE_DISABLED;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('output')).not.toBeNull();
  });
});
