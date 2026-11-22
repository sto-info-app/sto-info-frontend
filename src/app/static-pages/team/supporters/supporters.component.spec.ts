import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
      imports: [TeamSupportersComponent],
      providers: [provideRouter([])],
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

  // Each supporter is a panel card: the name on the heading block and the
  // note, where there is one, beneath it; without a note the block stands
  // alone. A supporter's card is a record, not a link, so it has no way on.
  // Current and past supporters share the one shape.
  it('draws each supporter as a panel card with the note beneath the name', () => {
    const grids: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ul.team-grid'),
    );
    expect(grids).toHaveLength(2);
    expect(grids.every(grid => grid.classList.contains('lcars-rotate'))).toBe(
      true,
    );

    const cards = grids.map(grid =>
      Array.from(grid.querySelectorAll<HTMLElement>('.team-card')).map(
        card => ({
          isLink: card.classList.contains('team-card--link'),
          link: card.querySelector('a'),
          name: card
            .querySelector('.team-card__heading h3.team-card__name')
            ?.textContent?.trim(),
          body: card.querySelector('.team-card__body'),
          note: card
            .querySelector('.team-card__body .team-card__title')
            ?.textContent?.trim(),
        }),
      ),
    );

    expect(cards).toEqual([
      [
        {
          isLink: false,
          link: null,
          name: 'Hikaru Sulu',
          body: expect.any(HTMLElement),
          note: 'Steady support through navigation upgrades.',
        },
        {
          isLink: false,
          link: null,
          name: 'Nyota Uhura',
          body: null,
          note: undefined,
        },
      ],
      [
        {
          isLink: false,
          link: null,
          name: 'Geordi La Forge',
          body: expect.any(HTMLElement),
          note: 'Early feedback on visual systems.',
        },
      ],
    ]);
  });
});
