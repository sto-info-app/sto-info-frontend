import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';
import { StorytimeService } from './storytime.service';

describe('StorytimeEnabledGuard', () => {
  let guard: StorytimeEnabledGuard;
  let storytimeService: { isEnabled: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    storytimeService = { isEnabled: jest.fn().mockReturnValue(of(true)) };
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
    storytimeService.isEnabled.mockReturnValue(of(false));

    await expect(firstValueFrom(guard.canActivate())).resolves.toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });
});
