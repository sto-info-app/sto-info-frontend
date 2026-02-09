import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { TEST_SUPPORTERS, TEST_TEAM_MEMBERS } from '../testing/team-test-data';
import { TeamSupportersComponent } from './supporters.component';

jest.mock('../team.data', () => {
  return {
    TEAM_MEMBERS: TEST_TEAM_MEMBERS,
    SUPPORTERS: TEST_SUPPORTERS,
  };
});

describe('TeamSupportersComponent', () => {
  let component: TeamSupportersComponent;
  let fixture: ComponentFixture<TeamSupportersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamSupportersComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamSupportersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list current and past supporters', () => {
    expect(component.currentSupporters.length).toBeGreaterThan(0);
    expect(component.pastSupporters.length).toBeGreaterThan(0);
  });

  it('should get route link', () => {
    const route = 'test-route';
    expect(component.getRouteLink(route)).toContain(route);
  });
});
