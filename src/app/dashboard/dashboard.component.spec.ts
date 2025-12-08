import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './services/dashboard.service';

describe('DashboardComponent', () => {
  //NOTE: Update & Restore tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    dashboardServiceSpy = jasmine.createSpyObj<DashboardService>(
      'DashboardService',
      ['getUser'],
    );
    dashboardServiceSpy.getUser.and.returnValue(of());

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
