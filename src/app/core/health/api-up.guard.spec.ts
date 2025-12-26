import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { apiUpGuard } from './api-up.guard';

describe('apiUpGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => apiUpGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
