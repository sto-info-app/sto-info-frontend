import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STORYTIME_COPY } from '../storytime.constants';
import { StorytimeLandingComponent } from './storytime-landing.component';

describe('StorytimeLandingComponent', () => {
  let fixture: ComponentFixture<StorytimeLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorytimeLandingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StorytimeLandingComponent);
    fixture.detectChanges();
  });

  it('is created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the feature title and introduction', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(STORYTIME_COPY.LANDING_TITLE);
    expect(text).toContain(STORYTIME_COPY.LANDING_INTRO);
  });

  // Required wherever fan-created Star Trek content is published.
  it('shows the fan content notice', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(STORYTIME_COPY.FAN_CONTENT_NOTICE);
  });
});
