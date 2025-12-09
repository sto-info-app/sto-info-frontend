import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './services/dashboard.service';

describe('DashboardComponent', () => {
  //NOTE: Update & Restore tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let dashboardServiceSpy: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    dashboardServiceSpy = {
      getUser: jest.fn().mockReturnValue(of()),
    } as unknown as jest.Mocked<DashboardService>;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: DashboardService, useValue: dashboardServiceSpy }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
