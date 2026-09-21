import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
} from '@angular/router';

import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { FLEET_SCOPE_ERROR } from 'src/app/fleet/scope/fleet-scope-page.directive';
import { FleetScopePageState } from 'src/app/fleet/scope/fleet-scope-page.models';
import {
  FleetAudience,
  FleetCommunity,
  FleetRecruitmentState,
  FleetScopeStatus,
  ResolvedFleetCommunity,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { CommunityPageComponent } from './community-page.component';

/**
 * Builds a Community as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The Community.
 */
function community(overrides: Partial<FleetCommunity> = {}): FleetCommunity {
  return {
    id: 'community-1',
    ownerUserId: 'user-1',
    name: 'United Federation Alliance',
    slug: 'united-federation-alliance',
    description: 'A home for casual PvE fleets.',
    recruitmentState: FleetRecruitmentState.OPEN,
    visibility: FleetAudience.PUBLIC,
    preferredTimezone: 'Europe/London',
    status: FleetScopeStatus.ACTIVE,
    closedAt: null,
    bannerImageId: null,
    bannerImageAlt: null,
    emblemImageId: null,
    emblemImageAlt: null,
    revision: 1,
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

describe('CommunityPageComponent', () => {
  let fixture: ComponentFixture<CommunityPageComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveCommunity: jest.Mock };
  let router: { navigate: jest.Mock };
  let pageTitle: { setTitle: jest.Mock };
  let formatted: string | null;

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({ communitySlug: 'united-federation-alliance' }),
    );
    scopes = {
      resolveCommunity: jest.fn(() =>
        of<ResolvedFleetCommunity>({
          community: community(),
          redirectedFrom: null,
        }),
      ),
    };
    router = { navigate: jest.fn() };
    pageTitle = { setTitle: jest.fn() };
    formatted = '2 January 2026';

    await TestBed.configureTestingModule({
      imports: [CommunityPageComponent],
      providers: [
        { provide: FleetScopeService, useValue: scopes },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        { provide: PageTitleService, useValue: pageTitle },
      ],
    })
      .overrideComponent(CommunityPageComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string | null => formatted },
            },
          ],
        },
      })
      .compileComponents();
  });

  /**
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(CommunityPageComponent);
    fixture.detectChanges();
  }

  /**
   * Reads the state the page is in.
   *
   * @returns The state.
   */
  const state = (): FleetScopePageState => {
    let current: FleetScopePageState | undefined;
    fixture.componentInstance.state$.subscribe(value => (current = value));

    return current as FleetScopePageState;
  };

  it('asks for the Community the address names', () => {
    render();

    expect(scopes.resolveCommunity).toHaveBeenCalledWith(
      'united-federation-alliance',
    );
  });

  it('reloads when the address changes', () => {
    render();

    params$.next(convertToParamMap({ communitySlug: 'ninth-fleet' }));

    expect(scopes.resolveCommunity).toHaveBeenLastCalledWith('ninth-fleet');
  });

  it('says it is loading before the server has answered', () => {
    scopes.resolveCommunity.mockReturnValue(new Subject());

    render();

    expect(state().kind).toBe('LOADING');
  });

  // "No such Community" and "the directory is down" call for different
  // things from a reader.
  it('reports an address nothing answers to as absent', () => {
    scopes.resolveCommunity.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(state()).toEqual({ kind: 'MISSING' });
  });

  it('reports any other failure as a failure', () => {
    scopes.resolveCommunity.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(state()).toEqual({ kind: 'ERROR', message: FLEET_SCOPE_ERROR });
  });

  it('names the page after the record', () => {
    render();

    expect(pageTitle.setTitle).toHaveBeenCalledWith(
      'United Federation Alliance',
    );
  });

  describe('what it draws', () => {
    it('heads the page with the Community, and no parent above it', () => {
      render();

      const drawn = state();

      expect(drawn.kind).toBe('READY');

      if (drawn.kind !== 'READY') {
        return;
      }

      expect(drawn.header.name).toBe('United Federation Alliance');
      expect(drawn.header.communityName).toBeNull();
      expect(drawn.header.platform).toBeNull();
      expect(drawn.description).toBe('A home for casual PvE fleets.');
    });

    it('lists when it was registered, who can see it and how it writes dates', () => {
      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.header.facts).toEqual([
        { label: 'Registered', value: '2 January 2026' },
        {
          label: 'Visible to',
          value: 'Anyone, including signed-out visitors',
        },
        { label: 'Dates shown in', value: 'Europe/London' },
      ]);
    });

    it('says when a closed Community was closed', () => {
      scopes.resolveCommunity.mockReturnValue(
        of({
          community: community({
            status: FleetScopeStatus.CLOSED,
            closedAt: '2026-05-06T07:08:09.000Z',
          }),
          redirectedFrom: null,
        }),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.header.facts).toContainEqual({
        label: 'Closed',
        value: '2 January 2026',
      });
      expect(drawn.kind === 'READY' && drawn.header.status).toEqual({
        label: 'Closed',
        modifier: 'closed',
      });
    });

    // The pipe answers null for a value it cannot read. Showing the instant
    // as the server wrote it is ugly and true; showing nothing would leave
    // the row saying "Registered" and then stopping.
    it('falls back to the raw instant when it cannot be written out', () => {
      formatted = null;

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
        label: 'Registered',
        value: '2026-01-02T03:04:05.000Z',
      });
    });

    it('draws the artwork the Community carries', () => {
      scopes.resolveCommunity.mockReturnValue(
        of({
          community: community({
            bannerImageId: 'banner-ref',
            bannerImageAlt: 'A fleet yard at dusk',
            emblemImageId: 'emblem-ref',
            emblemImageAlt: 'A crossed-sabres badge',
          }),
          redirectedFrom: null,
        }),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.header.banner?.url).toContain(
        'banner-ref/public',
      );
      expect(drawn.kind === 'READY' && drawn.header.emblem?.url).toContain(
        'emblem-ref/square300',
      );
    });
  });

  describe('when the address is out of date', () => {
    beforeEach(() => {
      scopes.resolveCommunity.mockReturnValue(
        of({ community: community(), redirectedFrom: 'the-old-name' }),
      );
    });

    // Replaced rather than pushed: a reader who arrived on a retired slug
    // and then pressed Back would otherwise be sent to the retired slug
    // again, and straight back here.
    it('replaces its own history entry with the current address', () => {
      render();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/fleets', 'communities', 'united-federation-alliance'],
        { replaceUrl: true, queryParamsHandling: 'preserve' },
      );
    });

    it('still shows the record it found', () => {
      render();

      expect(state().kind).toBe('READY');
    });
  });

  it('leaves the address alone when it is already the current one', () => {
    render();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('asks for nothing when the address has no segment at all', () => {
    params$.next(convertToParamMap({}));

    render();

    expect(scopes.resolveCommunity).toHaveBeenLastCalledWith('');
  });
});
