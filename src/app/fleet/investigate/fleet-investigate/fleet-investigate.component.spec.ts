import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, of, throwError } from 'rxjs';

import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  FLEET_SECTION_ERROR,
  FLEET_SECTION_MISSING,
  FleetSectionState,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import { FleetScopeAction } from 'src/app/fleet/scope/fleet-scope-page.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  FLEET_INVESTIGATE_NOT_PERMITTED,
  FleetInvestigateComponent,
} from './fleet-investigate.component';

const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';

/**
 * Builds the Fleet as the server resolves it, for a reader holding some
 * capabilities.
 *
 * @param capabilities - What they hold.
 * @param fleet - Changes to the Fleet.
 * @returns The resolved Fleet.
 */
function resolved(
  capabilities: string[],
  fleet: Partial<ResolvedStoFleet['fleet']> = {},
): ResolvedStoFleet {
  return {
    fleet: {
      id: 'fleet-1',
      slug: 'ninth-fleet',
      exactGameName: 'Ninth Fleet',
      communityId: 'community-1',
      platformProvidesRosterExport: true,
      ...fleet,
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: { capabilities },
  } as unknown as ResolvedStoFleet;
}

describe('FleetInvestigateComponent', () => {
  let fixture: ComponentFixture<FleetInvestigateComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
      }),
    );
    scopes = {
      resolveFleet: jest.fn(() =>
        of(resolved(['roster.import', 'roster.investigate'])),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [FleetInvestigateComponent],
      providers: [
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params$,
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(FleetInvestigateComponent);
    fixture.detectChanges();
  }

  /**
   * Reads what the page is showing.
   *
   * @returns Its state.
   */
  function state(): FleetSectionState<FleetScopeAction[]> {
    let current: FleetSectionState<FleetScopeAction[]> | undefined;

    fixture.componentInstance.state$.subscribe(value => (current = value));

    return current as FleetSectionState<FleetScopeAction[]>;
  }

  /**
   * Reads the links the page offers, tabs aside.
   *
   * @returns Each link's label and address.
   */
  function offered(): [string, string | null][] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.fleet-investigate__list a',
      ),
    ).map(link => [link.textContent?.trim() ?? '', link.getAttribute('href')]);
  }

  /** What the page says. */
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('resolves the Fleet the address names', () => {
    render();

    expect(scopes.resolveFleet).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'ninth-fleet',
    );
  });

  it('offers somebody who imports and investigates everything, with the strip above', () => {
    render();

    expect(offered()).toEqual([
      ['Import a roster export', `${FLEET_HREF}/import`],
      ['Roster imports', `${FLEET_HREF}/investigate/imports`],
      ['Roster identities', `${FLEET_HREF}/investigate/identities`],
      ['Rank order', `${FLEET_HREF}/investigate/rank-order`],
    ]);
    expect(text()).toContain('Investigate');
    expect(text()).toContain('Ninth Fleet');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
    ).not.toBeNull();
  });

  it('offers an importer the import and its results, not the renames', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.import'])));
    render();

    expect(offered().map(([label]) => label)).toEqual([
      'Import a roster export',
      'Roster imports',
    ]);
  });

  it('offers an investigator the imports and renames, not the upload', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.investigate'])));
    render();

    expect(offered().map(([label]) => label)).toEqual([
      'Roster imports',
      'Roster identities',
      'Rank order',
    ]);
  });

  it('tells a reader who may do neither so, with the strip still there', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.view'])));
    render();

    expect(state().kind).toBe('NOT_PERMITTED');
    expect(text()).toContain(FLEET_INVESTIGATE_NOT_PERMITTED);
    expect(offered()).toEqual([]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
    ).not.toBeNull();
  });

  it('treats a Fleet with no roster as having no such section', () => {
    scopes.resolveFleet.mockReturnValue(
      of(resolved(['roster.import'], { communityId: null })),
    );
    render();

    expect(state().kind).toBe('MISSING');
    expect(text()).toContain(FLEET_SECTION_MISSING);
  });

  it('says a Fleet that does not answer is missing', () => {
    scopes.resolveFleet.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render();

    expect(state().kind).toBe('MISSING');
  });

  it('says a request that failed failed, and can recover on the next address', () => {
    scopes.resolveFleet.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    render();

    expect(text()).toContain(FLEET_SECTION_ERROR);
    expect(offered()).toEqual([]);

    // The page's own subscription carries on to the next address.
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.import'])));
    params$.next(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
      }),
    );
    fixture.detectChanges();

    expect(text()).not.toContain(FLEET_SECTION_ERROR);
    expect(offered().length).toBeGreaterThan(0);
  });

  it('asks again when told to', () => {
    render();
    fixture.componentInstance.reload();

    expect(scopes.resolveFleet).toHaveBeenCalledTimes(2);
  });

  it('asks with empty segments when the address is incomplete', () => {
    params$.next(convertToParamMap({}));
    render();

    expect(scopes.resolveFleet).toHaveBeenCalledWith('', '', '');
  });

  it('shows nothing but the loading bar while the Fleet is read', () => {
    render();

    const directive = fixture.componentInstance;

    expect(directive.subjectOf({ kind: 'LOADING' })).toBeNull();
    expect(directive.messageOf({ kind: 'LOADING' })).toBeNull();
    expect(directive.tabsOf({ kind: 'LOADING' })).toBeNull();
  });

  it('offers no upload on a Fleet whose platform has no roster export', () => {
    scopes.resolveFleet.mockReturnValue(
      of(resolved(['roster.import'], { platformProvidesRosterExport: false })),
    );
    render();

    // A console Fleet has no sections at all.
    expect(state().kind).toBe('MISSING');
  });
});
