import { TestBed } from '@angular/core/testing';

import { GeneralThemeService } from './general-theme.service';

describe('GeneralThemeService', () => {
  let service: GeneralThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
