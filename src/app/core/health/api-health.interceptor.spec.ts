import { TestBed } from '@angular/core/testing';

import { ApiHealthInterceptor } from './api-health.interceptor';

describe('ApiHealthInterceptor', () => {
  let interceptor: ApiHealthInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiHealthInterceptor],
    });

    interceptor = TestBed.inject(ApiHealthInterceptor);
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
