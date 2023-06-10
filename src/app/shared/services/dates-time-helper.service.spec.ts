import { TestBed } from '@angular/core/testing';

import { DatesTimeHelperService } from './dates-time-helper.service';

describe('DatesTimeHelperService', () => {
  let service: DatesTimeHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatesTimeHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
