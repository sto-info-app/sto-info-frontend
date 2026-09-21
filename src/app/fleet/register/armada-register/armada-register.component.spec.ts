import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { BehaviorSubject, of, throwError } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { SCOPE_REGISTER_FAILED } from 'src/app/fleet/register/scope-register-page.directive';
import { ArmadaDuplicate, FleetScopeStatus } from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { ArmadaRegisterComponent } from './armada-register.component';

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
function duplicate(overrides: Partial<ArmadaDuplicate> = {}): ArmadaDuplicate {
  return {
    id: 'armada-9',
    exactGameName: 'Ninth Fleet Armada',
    communityId: 'community-2',
    communityName: 'Ninth Fleet',
    communitySlug: 'ninth-fleet',
    platformId: 'platform-1',
    platformName: 'PC',
    status: FleetScopeStatus.ACTIVE,
    ...overrides,
  };
}

describe('ArmadaRegisterComponent', () => {
  let fixture: ComponentFixture<ArmadaRegisterComponent>;
  let registration: {
    registerArmada: jest.Mock;
    findArmadaDuplicates: jest.Mock;
  };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    registration = {
      registerArmada: jest.fn(() =>
        of({
          armada: { slug: 'ninth-fleet-armada', platformSegment: 'pc' },
          duplicates: [],
        }),
      ),
      findArmadaDuplicates: jest.fn(() => of([])),
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ArmadaRegisterComponent],
      providers: [
        { provide: FleetRegistrationService, useValue: registration },
        {
          provide: FleetScopeService,
          useValue: {
            resolveCommunity: jest.fn(() =>
              of({ community: COMMUNITY, redirectedFrom: null }),
            ),
          },
        },
        {
          provide: StoAccountService,
          useValue: {
            getPlatforms: jest.fn(() => of([{ id: 'platform-1', name: 'PC' }])),
          },
        },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: new BehaviorSubject(
              convertToParamMap({
                communitySlug: 'united-federation-alliance',
              }),
            ),
          },
        },
      ],
    })
      .overrideComponent(ArmadaRegisterComponent, {
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
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(ArmadaRegisterComponent);
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
   * Fills the two required fields in.
   */
  function fillRequired(): void {
    type('#armada-name', 'Ninth Fleet Armada');

    const platform = find<HTMLSelectElement>(
      '#armada-platform',
    ) as HTMLSelectElement;

    platform.value = 'platform-1';
    platform.dispatchEvent(new Event('change'));
    fixture.detectChanges();
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
    registration.registerArmada.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >;

  // An Armada recruits nobody, and it is seen exactly as far as the
  // Community holding it, so there is nothing to choose about either.
  it('asks nothing about recruitment or visibility', () => {
    render();

    expect(find('#armada-recruitment')).toBeNull();
    expect(find('#armada-visibility')).toBeNull();
  });

  it('asks what the Community prefers to call it', () => {
    render();

    expect(find('#armada-display-name')).not.toBeNull();
  });

  it('sends the name, the platform and the preferred name', () => {
    render();

    fillRequired();
    type('#armada-display-name', '  The Ninth  ');
    submit();

    expect(sent()).toEqual({
      exactGameName: 'Ninth Fleet Armada',
      platformId: 'platform-1',
      displayName: 'The Ninth',
    });
  });

  it('sends a web address when one was typed', () => {
    render();

    fillRequired();
    type('#armada-slug', '  ninth  ');
    submit();

    expect(sent()['slug']).toBe('ninth');
  });

  it('leaves an empty preferred name out altogether', () => {
    render();

    fillRequired();
    submit();

    expect(sent()).not.toHaveProperty('displayName');
    expect(sent()).not.toHaveProperty('slug');
  });

  it('opens the Armada it just registered', () => {
    render();

    fillRequired();
    submit();

    expect(router.navigate).toHaveBeenCalledWith([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'armadas',
      'pc',
      'ninth-fleet-armada',
    ]);
  });

  it('refuses to send a registration with no name', () => {
    render();

    submit();

    expect(registration.registerArmada).not.toHaveBeenCalled();
    expect(find('.register-page__field-error')).not.toBeNull();
  });

  it('says something a reader can act on when the registration fails', () => {
    registration.registerArmada.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    render();
    fillRequired();
    submit();

    expect(fixture.nativeElement.textContent).toContain(SCOPE_REGISTER_FAILED);
  });

  describe('the duplicate warning', () => {
    it('asks the Armada collection', () => {
      render();

      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(registration.findArmadaDuplicates).toHaveBeenCalledWith(
        'community-1',
        'platform-1',
        'Ninth Fleet Armada',
      );
    });

    // Nothing imports a roster for an Armada, so there is nothing to be
    // fresh and an empty line would imply there was.
    it('carries no freshness line', () => {
      registration.findArmadaDuplicates.mockReturnValue(of([duplicate()]));

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(find('.scope-duplicate-warning__freshness')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Ninth Fleet · PC');
    });

    it('says when a match is closed', () => {
      registration.findArmadaDuplicates.mockReturnValue(
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
  });
});
