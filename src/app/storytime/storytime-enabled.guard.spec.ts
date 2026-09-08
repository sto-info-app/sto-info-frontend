import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
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
  let router: { parseUrl: jest.Mock };
  let urlTree: UrlTree;

  beforeEach(() => {
    urlTree = new UrlTree();
    storytimeService = {
      getAvailability: jest
        .fn()
        .mockReturnValue(of(STORYTIME_AVAILABILITY_ENABLED)),
    };
    router = { parseUrl: jest.fn().mockReturnValue(urlTree) };

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
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  // A switch somebody deliberately turned off is not a wrong address, and a
  // visitor told "page not found" has no reason to come back once it is on.
  it('sends the visitor to the unavailable page when Storytime is switched off', async () => {
    storytimeService.getAvailability.mockReturnValue(
      of(STORYTIME_AVAILABILITY_DISABLED),
    );

    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(urlTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/storytime/unavailable');
  });

  // A backend that could not be asked never said the feature was off, so the
  // visitor is owed an explanation rather than a 404 blaming their address.
  // The same page says so; it is the page that tells the two apart.
  it('sends the visitor to the unavailable page when the configuration could not be loaded', async () => {
    storytimeService.getAvailability.mockReturnValue(
      of(STORYTIME_AVAILABILITY_UNAVAILABLE),
    );

    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(urlTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/storytime/unavailable');
  });
});
