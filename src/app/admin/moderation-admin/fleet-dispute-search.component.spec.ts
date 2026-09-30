import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import { AdminCommunitySummary } from 'src/app/models/fleet-governance.models';
import { FleetAudience, FleetScopeStatus } from 'src/app/models/fleet.models';

import { FleetDisputeSearchComponent } from './fleet-dispute-search.component';

/**
 * A Community as the search finds it.
 *
 * @param overrides - What differs.
 * @returns The Community.
 */
const communityOf = (
  overrides: Partial<AdminCommunitySummary> = {},
): AdminCommunitySummary => ({
  id: 'community-1',
  name: 'Hidden Harbour',
  slug: 'hidden-harbour',
  visibility: FleetAudience.PRIVATE,
  status: FleetScopeStatus.ACTIVE,
  ownerUsername: 'Quark',
  ...overrides,
});

describe('FleetDisputeSearchComponent', () => {
  let fixture: ComponentFixture<FleetDisputeSearchComponent>;
  let governance: { communitiesAsSiteAdmin: jest.Mock };

  beforeEach(() => {
    governance = {
      communitiesAsSiteAdmin: jest.fn(() =>
        of({
          items: [
            communityOf(),
            communityOf({
              id: 'community-2',
              name: 'Members Moorings',
              slug: 'moorings',
              visibility: FleetAudience.COMMUNITY,
              status: FleetScopeStatus.SUSPENDED,
              ownerUsername: null,
            }),
            communityOf({
              id: 'community-3',
              name: 'Open Orbit',
              slug: 'open-orbit',
              visibility: FleetAudience.PUBLIC,
              status: FleetScopeStatus.CLOSED,
            }),
          ],
          total: 45,
          page: 1,
          pageSize: 20,
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [FleetDisputeSearchComponent],
      providers: [
        provideRouter([]),
        { provide: FleetGovernanceService, useValue: governance },
      ],
    });
  });

  /** Shows the page. */
  const show = async () => {
    fixture = TestBed.createComponent(FleetDisputeSearchComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement;

  /**
   * Types a term into the box and presses Search.
   *
   * @param term - What to type.
   */
  const search = async (term: string) => {
    const box = element().querySelector(
      '#fleet-dispute-search-input',
    ) as HTMLInputElement;

    box.value = term;
    box.dispatchEvent(new Event('input'));
    button('Search').click();
    await fixture.whenStable();
  };

  it('lists every Community at first, each linking to its dispute page', async () => {
    await show();

    const links = [...element().querySelectorAll('tbody a')];

    expect(governance.communitiesAsSiteAdmin).toHaveBeenCalledWith('', 1);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/fleets/communities/hidden-harbour/manage/dispute',
      '/fleets/communities/moorings/manage/dispute',
      '/fleets/communities/open-orbit/manage/dispute',
    ]);
    expect(links[0].textContent?.trim()).toBe('Hidden Harbour');
    expect(text()).toContain('The owner alone');
    expect(text()).toContain(
      'Followers of the Community and members of its Fleets',
    );
    expect(text()).toContain('Anyone, including signed-out visitors');
    expect(text()).toContain('Suspended');
    expect(text()).toContain('Closed');
    expect(text()).toContain('Quark');
    expect(text()).toContain('None on record');
    expect(text()).toContain('45');
  });

  // FC-050: "Fleet members" on a Community is every Fleet's members.
  it('says who a Community kept for its members may be seen by', async () => {
    governance.communitiesAsSiteAdmin.mockReturnValue(
      of({
        items: [communityOf({ visibility: FleetAudience.FLEET_MEMBERS })],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );

    await show();

    expect(text()).toContain(
      'Members of the Community’s Fleets, its Owner and Admins',
    );
    expect(text()).not.toContain('Approved members of the Fleet');
  });

  it('finds by the term typed, from the first page', async () => {
    await show();
    button('Next').click();
    await fixture.whenStable();
    expect(governance.communitiesAsSiteAdmin).toHaveBeenLastCalledWith('', 2);

    await search('  harbour ');

    expect(governance.communitiesAsSiteAdmin).toHaveBeenLastCalledWith(
      'harbour',
      1,
    );
  });

  it('pages through the same search', async () => {
    await show();
    await search('harbour');

    expect(text()).toContain('Page 1 of 3');
    expect(button('Previous').disabled).toBe(true);

    button('Next').click();
    await fixture.whenStable();
    expect(governance.communitiesAsSiteAdmin).toHaveBeenLastCalledWith(
      'harbour',
      2,
    );

    button('Previous').click();
    expect(governance.communitiesAsSiteAdmin).toHaveBeenLastCalledWith(
      'harbour',
      1,
    );
  });

  it('draws no paging when one page holds them all', async () => {
    governance.communitiesAsSiteAdmin.mockReturnValue(
      of({ items: [communityOf()], total: 1, page: 1, pageSize: 20 }),
    );
    await show();

    expect(text()).not.toContain('Page 1 of');
  });

  it('says when there are none, and when none matches', async () => {
    governance.communitiesAsSiteAdmin.mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 20 }),
    );
    await show();
    expect(text()).toContain('There are no Communities yet.');

    await search('nothing');
    expect(text()).toContain('No Community matches this search.');
  });

  it('says so when the list cannot be read', async () => {
    governance.communitiesAsSiteAdmin.mockReturnValue(
      throwError(() => new Error('down')),
    );
    await show();

    expect(text()).toContain('Communities could not be read.');
    expect(text()).not.toContain('There are no Communities yet.');
  });
});
