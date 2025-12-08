import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ProfileComponent } from './profile.component';
import { DashboardService } from '../services/dashboard.service';

describe('ProfileComponent', () => {
  //NOTE: Update & Restore tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    dashboardServiceSpy = jasmine.createSpyObj<DashboardService>(
      'DashboardService',
      ['getUser'],
    );
    dashboardServiceSpy.getUser.and.returnValue(of());

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [{ provide: DashboardService, useValue: dashboardServiceSpy }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
