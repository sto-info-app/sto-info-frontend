import { TestBed } from '@angular/core/testing';

import { DebuggingService } from './debugging.service';

describe('DebuggingService', () => {
  let service: DebuggingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DebuggingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
