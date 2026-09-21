import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
} from '@angular/router';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import {
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
  FleetScopeStatus,
  StoArmadaCard,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ArmadasDirectoryComponent } from './armadas-directory.component';

/**
 * Builds an Armada card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function armadaCard(overrides: Partial<StoArmadaCard> = {}): StoArmadaCard {
  return {
    id: 'armada-1',
    slug: 'ninth-fleet-armada',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    exactGameName: 'Ninth Fleet Armada',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    duplicateCount: 0,
    displayName: null,
    ...overrides,
  };
}

describe('ArmadasDirectoryComponent', () => {
  let fixture: ComponentFixture<ArmadasDirectoryComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let directory: { listArmadas: jest.Mock };
  let route: { queryParamMap: Observable<ParamMap>; snapshot: unknown };
  let accounts: { getPlatforms: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    directory = {
      listArmadas: jest.fn(() =>
        of({ items: [armadaCard()], total: 1, page: 1, pageSize: 12 }),
      ),
    };
    accounts = {
      getPlatforms: jest.fn(() => of([{ id: 'platform-1', name: 'PC' }])),
    };
    route = {
      queryParamMap: params$,
      snapshot: { queryParamMap: convertToParamMap({}) },
    };

    await TestBed.configureTestingModule({
      imports: [ArmadasDirectoryComponent],
      providers: [
        { provide: FleetDirectoryService, useValue: directory },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: route },
        { provide: StoAccountService, useValue: accounts },
      ],
    })
      .overrideComponent(ArmadasDirectoryComponent, {
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
   * Puts a question in the URL.
   *
   * @param query - The query string, as key and value.
   */
  function setParams(query: Record<string, string>): void {
    const map = convertToParamMap(query);

    route.snapshot = { queryParamMap: map };
    params$.next(map);
  }

  /**
   * Renders the listing.
   */
  function render(): void {
    fixture = TestBed.createComponent(ArmadasDirectoryComponent);
    fixture.detectChanges();
  }

  /** The question the service was last asked. */
  const lastQuery = (): Record<string, unknown> =>
    directory.listArmadas.mock.calls.at(-1)?.[0] as Record<string, unknown>;

  it('asks the Armada listing, not one of the other two', () => {
    render();

    expect(directory.listArmadas).toHaveBeenCalledWith({
      search: undefined,
      status: FleetDirectoryStatusFilter.ACTIVE,
      sort: FleetDirectorySort.NAME,
      page: 1,
      pageSize: 12,
    });
  });

  it('draws a card for each Armada', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain('Ninth Fleet Armada');
    expect(
      fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
    ).toHaveLength(1);
  });

  // Nothing imports a roster for an Armada.
  it('offers no freshness ordering', () => {
    render();

    expect(
      fixture.componentInstance.sortOptions.map(option => option.value),
    ).not.toContain(FleetDirectorySort.FRESHNESS);
  });

  it('shows a Community’s preferred name beneath the one the game holds', () => {
    directory.listArmadas.mockReturnValue(
      of({
        items: [armadaCard({ displayName: 'The Ninth' })],
        total: 1,
        page: 1,
        pageSize: 12,
      }),
    );

    render();

    expect(fixture.nativeElement.textContent).toContain('Ninth Fleet Armada');
    expect(fixture.nativeElement.textContent).toContain('Known as “The Ninth”');
  });

  describe('its own filter', () => {
    it('narrows by platform when the URL says so', () => {
      setParams({ platformId: 'platform-1' });

      render();

      expect(lastQuery()['platformId']).toBe('platform-1');
    });

    it('narrows by no platform when the URL asks for none', () => {
      render();

      expect(lastQuery()['platformId']).toBeUndefined();
    });

    it('offers the platforms to pick from', () => {
      render();

      expect(
        fixture.nativeElement.querySelector('#armadas-directory-platform')
          .textContent,
      ).toContain('PC');
    });

    /*
     * An Armada recruits nobody and nothing imports a roster for one, so the
     * other three filters would each be asking about something it does not
     * have.
     */
    it('offers no posture, allegiance or roster filter', () => {
      render();

      expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(3);
    });

    it('still lists the Armadas when the catalogue could not be read', () => {
      accounts.getPlatforms.mockReturnValue(throwError(() => new Error('no')));

      render();

      expect(
        fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
      ).toHaveLength(1);
    });
  });
});
