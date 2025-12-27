import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { apiRequiredGuard } from './api-required.guard';

describe('apiRequiredGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => apiRequiredGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
