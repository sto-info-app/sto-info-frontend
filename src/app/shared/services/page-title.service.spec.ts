import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
  let service: PageTitleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PageTitleService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {}, paramMap: new Map() },
            queryParams: of({}),
          },
        },
      ],
    });
    service = TestBed.inject(PageTitleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
