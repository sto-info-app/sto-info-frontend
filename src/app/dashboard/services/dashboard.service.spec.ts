import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  //NOTE: Update & Restore tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

  let service: DashboardService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [DashboardService],
    }).compileComponents();
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
