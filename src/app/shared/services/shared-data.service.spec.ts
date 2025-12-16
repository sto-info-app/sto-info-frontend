import { TestBed } from '@angular/core/testing';

import { SharedDataService } from './shared-data.service';

describe('SharedDataService', () => {
  let service: SharedDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharedDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('emits the most recent user ID value', () => {
    const receivedValues: string[] = [];
    const subscription = service.userId.subscribe(value =>
      receivedValues.push(value),
    );

    service.updateUserId('alpha-1');
    service.updateUserId('beta-2');

    expect(receivedValues).toEqual(['', 'alpha-1', 'beta-2']);

    subscription.unsubscribe();
  });
});
