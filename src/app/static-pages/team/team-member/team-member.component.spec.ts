import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
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

  const createComponent = async (
    slug: string | null | undefined,
    teamGroup: string | undefined,
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
    await createComponent('spock', 'developers');
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
    await createComponent('missing-slug', 'developers');

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
    expect(component.getGroupLink()).toContain('developers');
  });

  it('should get group link for volunteers', async () => {
    TestBed.resetTestingModule();
    await createComponent('janeway', 'volunteers');
    expect(component.groupLabel).toBe('Volunteers');
    expect(component.getGroupLink()).toContain('volunteers');
  });

  it('should handle missing slug in route', async () => {
    TestBed.resetTestingModule();
    await createComponent(undefined, 'developers');
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
});
