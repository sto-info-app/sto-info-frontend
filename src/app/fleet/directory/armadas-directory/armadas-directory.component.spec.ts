import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
} from '@angular/router';

import { BehaviorSubject, Observable, of } from 'rxjs';

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

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    directory = {
      listArmadas: jest.fn(() =>
        of({ items: [armadaCard()], total: 1, page: 1, pageSize: 12 }),
      ),
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
   * Renders the listing.
   */
  function render(): void {
    fixture = TestBed.createComponent(ArmadasDirectoryComponent);
    fixture.detectChanges();
  }

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
});
