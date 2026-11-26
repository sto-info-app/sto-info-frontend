import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { TEST_SUPPORTERS, TEST_TEAM_MEMBERS } from '../testing/team-test-data';

import { TeamDevelopersComponent } from './developers.component';

jest.mock('../team.data', () => {
  return {
    TEAM_MEMBERS: TEST_TEAM_MEMBERS,
    SUPPORTERS: TEST_SUPPORTERS,
  };
});

describe('TeamDevelopersComponent', () => {
  let component: TeamDevelopersComponent;
  let fixture: ComponentFixture<TeamDevelopersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDevelopersComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDevelopersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list current and past developers', () => {
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

  it('should build currentMemberVms and pastMemberVms', () => {
    expect(component.currentMemberVms).toHaveLength(
      component.currentMembers.length,
    );
    expect(component.pastMemberVms).toHaveLength(component.pastMembers.length);

    const vm = component.currentMemberVms[0];
    expect(vm.member).toBe(component.currentMembers[0]);
    expect(vm.link).toContain(vm.member.slug);
    expect(vm.thumbnailUrl).toContain(vm.member.slug);
  });

  it('should have a precomputed contact link', () => {
    expect(component.contactLink).toBe(`/${APP_ROUTES.CONTACT}`);
  });

  it('should offer Volunteers, About the App and Supporters in the side column', () => {
    const expected = [
      [`/${APP_ROUTES.ABOUT_VOLUNTEERS}`, APP_ROUTE_TITLES.ABOUT_VOLUNTEERS],
      [`/${APP_ROUTES.ABOUT}`, 'About the App'],
      [`/${APP_ROUTES.ABOUT_SUPPORTERS}`, APP_ROUTE_TITLES.ABOUT_SUPPORTERS],
    ];

    expect(component.navLinks.map(n => [n.link, n.label])).toEqual(expected);

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>(
        '.team-page-side-column app-team-navigation a.full-width-btn-link',
      ),
    );

    expect(
      links.map(a => [a.getAttribute('href'), a.textContent?.trim()]),
    ).toEqual(expected);
  });
});
