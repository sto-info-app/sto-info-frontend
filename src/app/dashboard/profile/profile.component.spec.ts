import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardService } from '../services/dashboard.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  //NOTE: Update & Restore tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let dashboardServiceSpy: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    dashboardServiceSpy = {
      getUser: jest.fn().mockReturnValue(of()),
    } as unknown as jest.Mocked<DashboardService>;

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
