import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable, of, Subject, throwError } from 'rxjs';

import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { COMMUNITY_AUDIENCE_HINT } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import { COMMUNITY_NAME_TOO_LONG } from 'src/app/fleet/fleet-name-length';
import {
  FleetAudience,
  FleetFeatureState,
  FleetRecruitmentState,
} from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import {
  COMMUNITY_OWNER_LIMIT_REACHED,
  COMMUNITY_REGISTER_FAILED,
  COMMUNITY_SLUG_TAKEN,
  CommunityRegisterComponent,
} from './community-register.component';

/**
 * Builds a feature state.
 *
 * @param overrides - Flags to override.
 * @returns The feature state.
 */
function features(
  overrides: Partial<FleetFeatureState> = {},
): FleetFeatureState {
  return {
    isEnabled: true,
    registrationEnabled: true,
    importsEnabled: true,
    chatEnabled: true,
    ...overrides,
  };
}

describe('CommunityRegisterComponent', () => {
  let fixture: ComponentFixture<CommunityRegisterComponent>;
  let registration: { registerCommunity: jest.Mock };
  let dashboard: { getUser: jest.Mock };
  let router: { navigate: jest.Mock };
  let featureState: FleetFeatureState;

  beforeEach(async () => {
    featureState = features();
    registration = {
      registerCommunity: jest.fn(() => of({ slug: 'steves-community' })),
    };
    dashboard = {
      getUser: jest.fn(() => of({ profile: { username: 'Steve' } })),
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [CommunityRegisterComponent],
      providers: [
        { provide: FleetRegistrationService, useValue: registration },
        { provide: DashboardService, useValue: dashboard },
        { provide: Router, useValue: router },
        // For the Help link's routerLink (FC-050).
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: FleetConfigurationService,
          useValue: {
            getFeatures: (): Observable<FleetFeatureState> => of(featureState),
          },
        },
      ],
    }).compileComponents();
  });

  /**
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(CommunityRegisterComponent);
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

  /** The name field. */
  const nameInput = (): HTMLInputElement =>
    find<HTMLInputElement>('#community-name') as HTMLInputElement;

  /** The body of the last registration sent. */
  const sent = (): Record<string, unknown> =>
    registration.registerCommunity.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;

  /**
   * Types into a control the way a person would.
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
   * Submits the form.
   */
  function submit(): void {
    (find<HTMLFormElement>('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
  }

  describe('the default name', () => {
    // FC-013's first acceptance criterion.
    it('starts as the registrant’s username plus Community', () => {
      render();

      expect(nameInput().value).toBe("Steve's Community");
    });

    it('leaves the field editable', () => {
      render();

      expect(nameInput().readOnly).toBe(false);
      expect(nameInput().disabled).toBe(false);

      type('#community-name', 'The Ninth Fleet');

      expect(fixture.componentInstance.form.controls.name.value).toBe(
        'The Ninth Fleet',
      );
    });

    it('registers what was typed over it rather than the default', () => {
      render();

      type('#community-name', 'The Ninth Fleet');
      submit();

      expect(sent()['name']).toBe('The Ninth Fleet');
    });

    // A convenience, not a precondition: somebody who came here to register
    // a Community can type a name.
    it.each([
      ['the profile cannot be read', () => throwError(() => new Error('x'))],
      ['the account has no profile', () => of({})],
    ])('leaves the field empty when %s', (_name, answer) => {
      dashboard.getUser.mockReturnValue(answer());

      render();

      expect(nameInput().value).toBe('');
    });

    it('does not overwrite a name already typed', () => {
      let emit: (user: { profile: { username: string } }) => void = () =>
        undefined;
      dashboard.getUser.mockReturnValue(
        new Observable<{ profile: { username: string } }>(subscriber => {
          emit = user => subscriber.next(user);
        }),
      );

      render();
      type('#community-name', 'The Ninth Fleet');
      emit({ profile: { username: 'Steve' } });
      fixture.detectChanges();

      expect(nameInput().value).toBe('The Ninth Fleet');
    });
  });

  describe('the audience choice', () => {
    it('says who each members audience means for a Community', () => {
      render();

      const hint = find<HTMLElement>('#community-visibility-hint');

      expect(hint?.textContent?.trim()).toBe(COMMUNITY_AUDIENCE_HINT);
      // FC-050: both audiences count the members of the Community's Fleets.
      expect(COMMUNITY_AUDIENCE_HINT).toContain(
        'the members of any of its Fleets',
      );
      expect(COMMUNITY_AUDIENCE_HINT).toContain('leaves out followers');
      // And "Community members" means the same on its Fleets.
      expect(COMMUNITY_AUDIENCE_HINT).toContain('the same on its Fleets');
      expect(
        find<HTMLSelectElement>('#community-visibility')?.getAttribute(
          'aria-describedby',
        ),
      ).toBe('community-visibility-hint');
    });
  });

  describe('registering', () => {
    it('sends the name, the posture, the audience and the timezone', () => {
      render();

      submit();

      expect(sent()).toEqual(
        expect.objectContaining({
          name: "Steve's Community",
          recruitmentState: FleetRecruitmentState.OPEN,
          visibility: FleetAudience.PUBLIC,
        }),
      );
      expect(sent()['preferredTimezone']).toEqual(expect.any(String));
    });

    // The server derives a web address from the name when none is given,
    // and refuses an empty string as one.
    it('leaves an empty web address and description out altogether', () => {
      render();

      submit();

      expect(sent()).not.toHaveProperty('slug');
      expect(sent()).not.toHaveProperty('description');
    });

    it('sends a web address and a description when they were filled in', () => {
      render();

      type('#community-slug', '  ninth-fleet  ');
      type('#community-description', '  A home for casual PvE fleets.  ');
      submit();

      expect(sent()['slug']).toBe('ninth-fleet');
      expect(sent()['description']).toBe('A home for casual PvE fleets.');
    });

    it('opens the Community it just registered', () => {
      render();

      submit();

      expect(router.navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'steves-community',
      ]);
    });

    it('refuses to send a registration with no name', () => {
      render();

      type('#community-name', '');
      submit();

      expect(registration.registerCommunity).not.toHaveBeenCalled();
      expect(find('.community-register__field-error')).not.toBeNull();
    });

    it('says a name over the server’s budget is too long, and sends nothing', () => {
      render();

      type('#community-name', 'a'.repeat(121));
      submit();

      expect(registration.registerCommunity).not.toHaveBeenCalled();
      expect(find('.community-register__field-error')?.textContent).toContain(
        COMMUNITY_NAME_TOO_LONG,
      );
    });

    // The server trims a Community name before measuring it, and so does
    // the form before sending it.
    it('does not count the spaces at either end against the budget', () => {
      render();

      type('#community-name', `  ${'a'.repeat(120)}  `);
      submit();

      expect(sent()['name']).toBe('a'.repeat(120));
    });

    it('cannot be sent twice while the first is in flight', () => {
      registration.registerCommunity.mockReturnValue(new Observable());

      render();

      submit();
      submit();

      expect(registration.registerCommunity).toHaveBeenCalledTimes(1);
    });
  });

  describe('when it fails', () => {
    /**
     * Fails the registration with a status.
     *
     * @param status - The HTTP status to fail with.
     */
    function failWith(status: number, message?: string): void {
      registration.registerCommunity.mockReturnValue(
        throwError(() => ({ status, error: { message } })),
      );
    }

    // The server suffixes a taken address while registering, so the only
    // collision that reaches here is two registrations racing for the same
    // typed one — worth saying plainly rather than retrying silently under
    // a name somebody chose deliberately.
    it('says so plainly when the web address was taken first', () => {
      failWith(409);

      render();
      submit();

      expect(fixture.nativeElement.textContent).toContain(COMMUNITY_SLUG_TAKEN);
    });

    // The limit is a 409 too. A closed Community still counts towards it,
    // so telling somebody their address was taken — or to close one — would
    // send them round in a circle.
    it('says the limit, closed ones included, when the server names it', () => {
      failWith(
        409,
        'You may own at most 10 Fleet Communities, closed ones included. ' +
          'If you need more, use Contact us.',
      );

      render();
      submit();

      const text = fixture.nativeElement.textContent;

      expect(text).toContain(COMMUNITY_OWNER_LIMIT_REACHED);
      expect(text).not.toContain(COMMUNITY_SLUG_TAKEN);
    });

    // FC-044: a real answer arrives after the submit's own change detection,
    // and on an OnPush page nothing redrew it: "Registering the Community"
    // stayed up for good and the reason never showed.
    it('takes the loading bar down and says why when the refusal arrives later', () => {
      const answer = new Subject<never>();

      registration.registerCommunity.mockReturnValue(answer);

      render();
      submit();

      expect(find('app-loading-bar')).not.toBeNull();

      answer.error({
        status: 409,
        error: {
          message:
            'You may own at most 10 Fleet Communities, closed ones included. ' +
            'If you need more, use Contact us.',
        },
      });
      fixture.detectChanges();

      expect(find('app-loading-bar')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        COMMUNITY_OWNER_LIMIT_REACHED,
      );
    });

    it('says something a reader can act on for any other failure', () => {
      failWith(500);

      render();
      submit();

      expect(fixture.nativeElement.textContent).toContain(
        COMMUNITY_REGISTER_FAILED,
      );
    });

    it('lets the registration be tried again', () => {
      failWith(500);

      render();
      submit();

      registration.registerCommunity.mockReturnValue(
        of({ slug: 'steves-community' }),
      );
      submit();

      expect(registration.registerCommunity).toHaveBeenCalledTimes(2);
      expect(router.navigate).toHaveBeenCalled();
    });
  });

  // A form that let somebody fill in six fields and then said no would be a
  // form that wasted their time.
  it.each([
    ['the feature', features({ isEnabled: false })],
    ['registration', features({ registrationEnabled: false })],
  ])('asks for nothing while %s is switched off', (_name, state) => {
    featureState = state;

    render();

    expect(find('form')).toBeNull();
    expect(find('app-feature-unavailable')).not.toBeNull();
  });
});
