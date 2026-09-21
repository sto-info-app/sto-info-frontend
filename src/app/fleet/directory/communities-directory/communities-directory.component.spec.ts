import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, Observable, of } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import {
  FleetCommunityCard,
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
  FleetRecruitmentState,
  FleetScopeStatus,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { CommunitiesDirectoryComponent } from './communities-directory.component';

/**
 * Builds a Community card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function communityCard(
  overrides: Partial<FleetCommunityCard> = {},
): FleetCommunityCard {
  return {
    id: 'community-1',
    slug: 'united-federation-alliance',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    name: 'United Federation Alliance',
    description: 'A home for casual PvE fleets.',
    recruitmentState: FleetRecruitmentState.OPEN,
    ...overrides,
  };
}

describe('CommunitiesDirectoryComponent', () => {
  let fixture: ComponentFixture<CommunitiesDirectoryComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let directory: { listCommunities: jest.Mock };
  let route: { queryParamMap: Observable<ParamMap>; snapshot: unknown };
  let isLoggedIn: boolean;

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    directory = {
      listCommunities: jest.fn(() =>
        of({ items: [communityCard()], total: 1, page: 1, pageSize: 12 }),
      ),
    };
    route = {
      queryParamMap: params$,
      snapshot: { queryParamMap: convertToParamMap({}) },
    };
    isLoggedIn = true;

    await TestBed.configureTestingModule({
      imports: [CommunitiesDirectoryComponent],
      providers: [
        { provide: FleetDirectoryService, useValue: directory },
        // A real router, so the registration link renders the address it
        // would actually go to.
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        {
          provide: AuthService,
          useValue: { isLoggedIn: (): boolean => isLoggedIn },
        },
      ],
    })
      .overrideComponent(CommunitiesDirectoryComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string => '4 March 2015' },
            },
          ],
        },
      })
      .compileComponents();
  });

  /**
   * Renders the listing.
   */
  function render(): void {
    fixture = TestBed.createComponent(CommunitiesDirectoryComponent);
    fixture.detectChanges();
  }

  it('asks the Community listing, not one of the other two', () => {
    render();

    expect(directory.listCommunities).toHaveBeenCalledWith({
      search: undefined,
      status: FleetDirectoryStatusFilter.ACTIVE,
      sort: FleetDirectorySort.NAME,
      page: 1,
      pageSize: 12,
    });
  });

  it('draws a card for each Community', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'United Federation Alliance',
    );
    expect(
      fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
    ).toHaveLength(1);
  });

  // Nothing observes a Community, so there is no roster import for one to be
  // fresh, and the server answers 400 rather than ordering by something else.
  it('offers no freshness ordering', () => {
    render();

    expect(
      fixture.componentInstance.sortOptions.map(option => option.value),
    ).not.toContain(FleetDirectorySort.FRESHNESS);
  });

  it('ignores a freshness ordering pasted into the URL', () => {
    const map = convertToParamMap({ sort: FleetDirectorySort.FRESHNESS });
    route.snapshot = { queryParamMap: map };
    params$.next(map);

    render();

    expect(directory.listCommunities.mock.calls.at(-1)?.[0]['sort']).toBe(
      FleetDirectorySort.NAME,
    );
  });
  describe('registering one', () => {
    /**
     * The link offering registration.
     *
     * @returns The link, or null.
     */
    const registerLink = (): HTMLAnchorElement | null =>
      fixture.nativeElement.querySelector(
        '.communities-directory__register a',
      ) as HTMLAnchorElement | null;

    it('offers registration to somebody signed in', () => {
      render();

      expect(registerLink()?.getAttribute('href')).toBe('/fleets/register');
    });

    // Signed in is the only condition checked here. Whether the switch is
    // on is the registration page's own answer, and asking it twice would
    // mean two places to keep in step.
    it('offers nothing to a signed-out visitor', () => {
      isLoggedIn = false;

      render();

      expect(registerLink()).toBeNull();
    });
  });
});
