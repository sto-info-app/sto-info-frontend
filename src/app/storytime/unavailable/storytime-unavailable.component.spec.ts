import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  STORYTIME_AVAILABILITY_DISABLED,
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
  StorytimeAvailability,
} from 'src/app/models/storytime.models';

import { StorytimeService } from '../storytime.service';
import { StorytimeUnavailableComponent } from './storytime-unavailable.component';

describe('StorytimeUnavailableComponent', () => {
  let fixture: ComponentFixture<StorytimeUnavailableComponent>;
  let component: StorytimeUnavailableComponent;
  let navigateSpy: jest.SpyInstance;

  const text = (): string => fixture.nativeElement.textContent as string;

  /**
   * Builds the page with the availability the backend reports.
   *
   * @param availability What the Storytime configuration says.
   */
  const build = (availability: StorytimeAvailability): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StorytimeUnavailableComponent],
      providers: [
        provideRouter([]),
        {
          provide: StorytimeService,
          useValue: { getAvailability: () => of(availability) },
        },
      ],
    });

    navigateSpy = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(StorytimeUnavailableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // A 404 tells a visitor their address is wrong. It is not, and the feature
  // is coming back, so the page says which of the two things happened instead.
  it('says the systems are not answering when the configuration could not be loaded', () => {
    build(STORYTIME_AVAILABILITY_UNAVAILABLE);

    expect(component.reason).toBe('OFFLINE');
    expect(text()).toContain('systems are not answering');
  });

  it('says the feature is switched off when the switch is off', () => {
    build(STORYTIME_AVAILABILITY_DISABLED);

    expect(component.reason).toBe('DISABLED');
    expect(text()).toContain('switched off at the moment');
  });

  // The guard read the availability a moment ago. Reading it again here is
  // what stops a visitor arriving after a recovery being shown a notice about
  // an outage that is over.
  it('sends the visitor on to Storytime when it turns out to be on', () => {
    build(STORYTIME_AVAILABILITY_ENABLED);

    expect(navigateSpy).toHaveBeenCalledWith(['/storytime']);
  });
});
