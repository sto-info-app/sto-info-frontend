import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TEST_SUPPORTERS, TEST_TEAM_MEMBERS } from '../testing/team-test-data';

import { TeamVolunteersComponent } from './volunteers.component';

jest.mock('../team.data', () => {
  return {
    TEAM_MEMBERS: TEST_TEAM_MEMBERS,
    SUPPORTERS: TEST_SUPPORTERS,
  };
});

describe('TeamVolunteersComponent', () => {
  let component: TeamVolunteersComponent;
  let fixture: ComponentFixture<TeamVolunteersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamVolunteersComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamVolunteersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list current and past volunteers', () => {
    expect(component.currentMembers.length).toBeGreaterThan(0);
    expect(component.pastMembers.length).toBeGreaterThan(0);
  });

  it('should build thumbnail urls', () => {
    const photoUrl = 'https://example.com/photo';

    expect(component.getThumbnailUrl(photoUrl)).toBe(
      `${photoUrl}/${component.photoVariant}`,
    );
    expect(component.getThumbnailUrl()).toBe(component.fallbackPhotoUrl);
  });

  it('should get member link', () => {
    const member = TEST_TEAM_MEMBERS[0];
    expect(component.getMemberLink(member)).toContain(member.slug);
  });

  it('should get route link', () => {
    const route = 'test-route';
    expect(component.getRouteLink(route)).toContain(route);
  });
});
