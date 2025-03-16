import { TestBed } from '@angular/core/testing';

import { LogRocketService } from './log-rocket.service';

describe('LogRocketService', () => {
  let service: LogRocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LogRocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
