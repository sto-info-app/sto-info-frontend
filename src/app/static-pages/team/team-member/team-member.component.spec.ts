import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TeamGroup } from '../models/team-group.model';
import { TEST_SUPPORTERS, TEST_TEAM_MEMBERS } from '../testing/team-test-data';

import { TeamMemberComponent } from './team-member.component';

jest.mock('../team.data', () => {
  return {
    TEAM_MEMBERS: TEST_TEAM_MEMBERS,
    SUPPORTERS: TEST_SUPPORTERS,
  };
});

describe('TeamMemberComponent', () => {
  let component: TeamMemberComponent;
  let fixture: ComponentFixture<TeamMemberComponent>;

  const developersGroup: TeamGroup = 'developers';
  const volunteersGroup: TeamGroup = 'volunteers';

  const createComponent = async (
    slug: string | null | undefined,
    teamGroup: TeamGroup | undefined,
  ) => {
    const paramMap = new Map();
    if (slug !== undefined) {
      paramMap.set('slug', slug);
    }

    await TestBed.configureTestingModule({
      imports: [TeamMemberComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: paramMap,
              data: { teamGroup },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamMemberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await createComponent('spock', developersGroup);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve a member from route data', () => {
    expect(component.member?.name).toBe('Spock');
    expect(component.groupLabel).toBe('Developers');
  });

  it('should fall back when no member is found', async () => {
    TestBed.resetTestingModule();
    await createComponent('missing-slug', developersGroup);

    expect(component.member).toBeUndefined();
    expect(component.groupLabel).toBe('Developers');
  });

  it('should build the member photo url', () => {
    const photoUrl = 'https://example.com/photo';
    expect(component.getMemberPhotoUrl(photoUrl)).toBe(
      `${photoUrl}/${component.photoVariant}`,
    );
  });

  it('should use fallback photo url when missing', () => {
    expect(component.getMemberPhotoUrl()).toBe(component.fallbackPhotoUrl);
  });

  it('should get group link for developers', () => {
    expect(component.getGroupLink()).toContain(developersGroup);
  });

  it('should get group link for volunteers', async () => {
    TestBed.resetTestingModule();
    await createComponent('janeway', volunteersGroup);
    expect(component.groupLabel).toBe('Volunteers');
    expect(component.getGroupLink()).toContain(volunteersGroup);
  });

  it('should handle missing slug in route', async () => {
    TestBed.resetTestingModule();
    await createComponent(undefined, developersGroup);
    expect(component.member).toBeUndefined();
  });

  it('should get route link', () => {
    const route = 'test-route';
    expect(component.getRouteLink(route)).toContain(route);
  });

  it('should handle null target in onPhotoError', () => {
    // Should not throw
    expect(() =>
      component.onPhotoError({ target: null } as unknown as Event),
    ).not.toThrow();
  });

  it('should swap to fallback on photo error', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/missing.jpg';

    component.onPhotoError({ target: img } as unknown as Event);

    expect(img.src).toContain(component.fallbackPhotoUrl);
  });

  it('should precompute groupLink, aboutLink, supportersLink and photoUrl', () => {
    expect(component.groupLink).toContain(developersGroup);
    expect(component.aboutLink).toBe(`/${APP_ROUTES.ABOUT}`);
    expect(component.supportersLink).toBe(`/${APP_ROUTES.ABOUT_SUPPORTERS}`);
    // spock has a photoUrl set in test data
    expect(component.photoUrl).toContain('spock');
  });

  it('should precompute groupLink for volunteers group', async () => {
    TestBed.resetTestingModule();
    await createComponent('janeway', volunteersGroup);
    expect(component.groupLink).toContain(volunteersGroup);
  });

  it('should use fallback photoUrl when member has no photo', async () => {
    TestBed.resetTestingModule();
    await createComponent('missing-slug', developersGroup);
    expect(component.photoUrl).toBe(component.fallbackPhotoUrl);
  });
});
