import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  SCOPE_REGISTER_FAILED,
  SCOPE_REGISTER_FORBIDDEN,
  SCOPE_REGISTER_SLUG_TAKEN,
  SCOPE_REGISTER_UNREADABLE,
} from 'src/app/fleet/register/scope-register-page.directive';
import { FleetDuplicate, FleetScopeStatus } from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { FleetRegisterComponent } from './fleet-register.component';

/** The Community the form registers into. */
const COMMUNITY = {
  id: 'community-1',
  slug: 'united-federation-alliance',
  name: 'United Federation Alliance',
};

/**
 * Builds a match the server might warn about.
 *
 * @param overrides - Fields to override.
 * @returns The match.
 */
function duplicate(overrides: Partial<FleetDuplicate> = {}): FleetDuplicate {
  return {
    id: 'fleet-9',
    exactGameName: 'Starfleet Command',
    communityId: 'community-2',
    communityName: 'Ninth Fleet',
    communitySlug: 'ninth-fleet',
    platformId: 'platform-1',
    platformName: 'PC',
    lastEffectiveImportAt: null,
    status: FleetScopeStatus.ACTIVE,
    ...overrides,
  };
}

describe('FleetRegisterComponent', () => {
  let fixture: ComponentFixture<FleetRegisterComponent>;
  let registration: {
    registerFleet: jest.Mock;
    findFleetDuplicates: jest.Mock;
  };
  let scopes: { resolveCommunity: jest.Mock };
  let accounts: { getPlatforms: jest.Mock };
  let router: { navigate: jest.Mock };
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let formatted: string | null;

  beforeEach(async () => {
    registration = {
      registerFleet: jest.fn(() =>
        of({
          fleet: { slug: 'starfleet-command', platformSegment: 'pc' },
          duplicates: [],
        }),
      ),
      findFleetDuplicates: jest.fn(() => of([])),
    };
    scopes = {
      resolveCommunity: jest.fn(() =>
        of({ community: COMMUNITY, redirectedFrom: null }),
      ),
    };
    accounts = {
      getPlatforms: jest.fn(() =>
        of([
          { id: 'platform-1', name: 'PC' },
          { id: 'platform-2', name: 'Xbox' },
        ]),
      ),
    };
    router = { navigate: jest.fn() };
    formatted = '4 March 2015';
    params$ = new BehaviorSubject(
      convertToParamMap({ communitySlug: 'united-federation-alliance' }),
    );

    await TestBed.configureTestingModule({
      imports: [FleetRegisterComponent],
      providers: [
        { provide: FleetRegistrationService, useValue: registration },
        { provide: FleetScopeService, useValue: scopes },
        { provide: StoAccountService, useValue: accounts },
        { provide: Router, useValue: router },
        {
          provide: CharacterLookupService,
          useValue: {
            getGeneralFactions: (): Observable<
              { id: string; name: string }[]
            > => of([{ id: 'faction-1', name: 'Federation' }]),
          },
        },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
      ],
    })
      .overrideComponent(FleetRegisterComponent, {
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
    fixture = TestBed.createComponent(FleetRegisterComponent);
    fixture.detectChanges();
  }

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = <T extends HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null;

  /**
   * Types into a control.
   *
   * @param selector - The control's CSS selector.
   * @param value - What to type.
   */
  function type(selector: string, value: string): void {
    const control = find<HTMLInputElement>(selector) as HTMLInputElement;

    control.value = value;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /**
   * Picks an option in a select.
   *
   * @param selector - The select's CSS selector.
   * @param value - The value to pick.
   */
  function pick(selector: string, value: string): void {
    const control = find<HTMLSelectElement>(selector) as HTMLSelectElement;

    control.value = value;
    control.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /**
   * Fills the two required fields in.
   */
  function fillRequired(): void {
    type('#fleet-name', 'Starfleet Command ');
    pick('#fleet-platform', 'platform-1');
  }

  /**
   * Submits the form.
   */
  function submit(): void {
    (find<HTMLFormElement>('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
  }

  /** The body of the last registration sent. */
  const sent = (): Record<string, unknown> =>
    registration.registerFleet.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >;

  describe('before it can ask anything', () => {
    it('reads the Community and the platform catalogue together', () => {
      render();

      expect(scopes.resolveCommunity).toHaveBeenCalledWith(
        'united-federation-alliance',
      );
      expect(accounts.getPlatforms).toHaveBeenCalled();
      expect(find('#fleet-platform')?.textContent).toContain('Xbox');
    });

    it('asks for nothing when the address carries no Community', () => {
      params$.next(convertToParamMap({}));

      render();

      expect(scopes.resolveCommunity).toHaveBeenLastCalledWith('');
    });

    it('names the Community the record will belong to', () => {
      render();

      expect(fixture.nativeElement.textContent).toContain(
        'United Federation Alliance',
      );
    });

    it('reports a Community nothing answers to as absent', () => {
      scopes.resolveCommunity.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(find('app-lcars-information-message')).not.toBeNull();
      expect(find('form')).toBeNull();
    });

    it('reports any other failure as a failure', () => {
      scopes.resolveCommunity.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.nativeElement.textContent).toContain(
        SCOPE_REGISTER_UNREADABLE,
      );
    });
  });

  describe('the duplicate warning', () => {
    it('asks nothing until there is a name and a platform', () => {
      render();

      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(registration.findFleetDuplicates).not.toHaveBeenCalled();
    });

    // Matching folds case and nothing else, so the name goes as typed.
    it('asks with the name exactly as it was typed', () => {
      render();

      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(registration.findFleetDuplicates).toHaveBeenCalledWith(
        'community-1',
        'platform-1',
        'Starfleet Command ',
      );
    });

    // Whose it is and how current it is: FC-013's third acceptance
    // criterion, on the screen where it matters.
    it('says whose each match is and how current it is', () => {
      registration.findFleetDuplicates.mockReturnValue(
        of([duplicate({ lastEffectiveImportAt: '2015-03-04T00:00:00Z' })]),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Ninth Fleet · PC');
      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 4 March 2015',
      );
    });

    // The pipe answers null for a value it cannot read. The instant as the
    // server wrote it is ugly and true; nothing at all would hide the one
    // fact the comparison turns on.
    it('falls back to the raw instant when it cannot be written out', () => {
      formatted = null;
      registration.findFleetDuplicates.mockReturnValue(
        of([duplicate({ lastEffectiveImportAt: '2015-03-04T00:00:00Z' })]),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 2015-03-04T00:00:00Z',
      );
    });

    it('says plainly when a match has never been imported', () => {
      registration.findFleetDuplicates.mockReturnValue(of([duplicate()]));

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'No roster has ever been imported',
      );
    });

    it('names a match that belongs to no Community for what it is', () => {
      registration.findFleetDuplicates.mockReturnValue(
        of([duplicate({ communityId: null, communityName: null })]),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'No Community — a standalone record',
      );
    });

    it('says when a match is closed', () => {
      registration.findFleetDuplicates.mockReturnValue(
        of([duplicate({ status: FleetScopeStatus.CLOSED })]),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'This record is closed',
      );
    });

    // Advice, not a gate: refusing to let somebody register because the
    // advice is unavailable would be the wrong way round.
    it('reports a warning it could not fetch as no warning', () => {
      registration.findFleetDuplicates.mockReturnValue(
        throwError(() => new Error('nope')),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Nothing else answers to that name',
      );
    });

    it('asks once while an answer is still coming', () => {
      registration.findFleetDuplicates.mockReturnValue(new Observable());

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(registration.findFleetDuplicates).toHaveBeenCalledTimes(1);
    });
  });

  describe('registering', () => {
    it('sends the name untrimmed, spaces and all', () => {
      render();

      fillRequired();
      submit();

      expect(sent()['exactGameName']).toBe('Starfleet Command ');
    });

    it('sends the platform by identifier rather than by segment', () => {
      render();

      fillRequired();
      submit();

      expect(sent()['platformId']).toBe('platform-1');
    });

    it('leaves an unstated allegiance and web address out altogether', () => {
      render();

      fillRequired();
      submit();

      expect(sent()).not.toHaveProperty('allegianceFactionId');
      expect(sent()).not.toHaveProperty('slug');
    });

    it('sends an allegiance and a web address when they were chosen', () => {
      render();

      fillRequired();
      pick('#fleet-allegiance', 'faction-1');
      type('#fleet-slug', '  omega  ');
      submit();

      expect(sent()['allegianceFactionId']).toBe('faction-1');
      expect(sent()['slug']).toBe('omega');
    });

    it('opens the Fleet it just registered', () => {
      render();

      fillRequired();
      submit();

      expect(router.navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'united-federation-alliance',
        'fleets',
        'pc',
        'starfleet-command',
      ]);
    });

    it.each([
      ['a name', '#fleet-platform', 'platform-1'],
      ['a platform', '#fleet-name', 'Starfleet Command'],
    ])(
      'refuses to send a registration with no %s',
      (_name, selector, value) => {
        render();

        if (selector === '#fleet-platform') {
          pick(selector, value);
        } else {
          type(selector, value);
        }

        submit();

        expect(registration.registerFleet).not.toHaveBeenCalled();
        expect(find('.register-page__field-error')).not.toBeNull();
      },
    );

    it('cannot be sent twice while the first is in flight', () => {
      registration.registerFleet.mockReturnValue(new Observable());

      render();
      fillRequired();
      submit();
      submit();

      expect(registration.registerFleet).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the registration fails', () => {
    /**
     * Fails the registration with a status, then tries it.
     *
     * @param status - The status to fail with.
     */
    function failWith(status: number): void {
      registration.registerFleet.mockReturnValue(
        throwError(() => ({ status })),
      );

      render();
      fillRequired();
      submit();
    }

    it.each([
      [409, SCOPE_REGISTER_SLUG_TAKEN],
      [403, SCOPE_REGISTER_FORBIDDEN],
      [500, SCOPE_REGISTER_FAILED],
    ])('says something a reader can act on for a %s', (status, message) => {
      failWith(status);

      expect(fixture.nativeElement.textContent).toContain(message);
    });
  });
});
