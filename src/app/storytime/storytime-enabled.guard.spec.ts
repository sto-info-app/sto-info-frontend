import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import {
  STORYTIME_AVAILABILITY_DISABLED,
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
} from 'src/app/models/storytime.models';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';
import { StorytimeService } from './storytime.service';

describe('StorytimeEnabledGuard', () => {
  let guard: StorytimeEnabledGuard;
  let storytimeService: { getAvailability: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    storytimeService = {
      getAvailability: jest
        .fn()
        .mockReturnValue(of(STORYTIME_AVAILABILITY_ENABLED)),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        StorytimeEnabledGuard,
        { provide: StorytimeService, useValue: storytimeService },
        { provide: Router, useValue: router },
      ],
    });

    guard = TestBed.inject(StorytimeEnabledGuard);
  });

  it('is created', () => {
    expect(guard).toBeTruthy();
  });

  it('allows the route when Storytime is enabled', async () => {
    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // A feature that is off should look like one that does not exist, so a
  // staged rollout does not advertise what is coming.
  it('sends the visitor to the not-found page when Storytime is disabled', async () => {
    storytimeService.getAvailability.mockReturnValue(
      of(STORYTIME_AVAILABILITY_DISABLED),
    );

    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });

  // A backend that could not be asked never said the feature was off, so the
  // visitor is owed an outage page rather than a 404 blaming their address.
  it('sends the visitor to the service interruption page when the configuration could not be loaded', async () => {
    storytimeService.getAvailability.mockReturnValue(
      of(STORYTIME_AVAILABILITY_UNAVAILABLE),
    );

    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/service-interruption']);
  });
});
