import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { COMMUNITY_AUDIENCE_HINT } from 'src/app/fleet/constants/fleet-scope.constants';
import {
  COMMUNITY_NAME_TOO_LONG,
  EXACT_GAME_NAME_TOO_LONG,
} from 'src/app/fleet/fleet-name-length';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import {
  governanceCommunity,
  governanceFleet,
  GovernanceReader,
  governanceRoute,
  GovernanceRouteStubs,
} from 'src/app/fleet/governance/governance.testing';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetAudience,
  FleetCommunity,
  FleetRecruitmentState,
  FleetScopeStatus,
  ResolvedFleetCommunity,
  ResolvedStoFleet,
  StoFleet,
} from 'src/app/models/fleet.models';

import {
  COMMUNITY_SETTINGS_LOCKED,
  FLEET_SETTINGS_LOCKED,
  SCOPE_SETTINGS_MOVED,
  SCOPE_SETTINGS_NOT_PERMITTED,
  SCOPE_SETTINGS_SAVE_FAILED,
  SCOPE_SETTINGS_SAVED,
  SCOPE_SETTINGS_SLUG_TAKEN,
  SCOPE_SETTINGS_UNCHANGED,
  ScopeSettingsComponent,
  settingsStaleMessage,
} from './scope-settings.component';

/** The Owner, holding the settings. */
const OWNER: GovernanceReader = {
  roles: ['OWNER'],
  capabilities: ['scope.settings.manage'],
};

/** The Owner of one of the Community's Fleets. */
const FLEET_OWNER: GovernanceReader = { ...OWNER, onFleet: true };

/**
 * The Community as the server resolves it, every setting filled in.
 *
 * @param reader - Who is reading.
 * @param overrides - Fields of the Community to override.
 * @returns The resolved Community.
 */
function communityFor(
  reader: GovernanceReader,
  overrides: Partial<FleetCommunity> = {},
): ResolvedFleetCommunity {
  const resolved = governanceCommunity(reader);

  return {
    ...resolved,
    community: {
      ...resolved.community,
      description: 'Fleets flying together.',
      recruitmentState: FleetRecruitmentState.APPLICATION,
      visibility: FleetAudience.PUBLIC,
      preferredTimezone: 'UTC',
      revision: 4,
      ...overrides,
    },
  };
}

/**
 * The Fleet as the server resolves it, every setting filled in.
 *
 * @param reader - Who is reading.
 * @param overrides - Fields of the Fleet to override.
 * @returns The resolved Fleet.
 */
function fleetFor(
  reader: GovernanceReader,
  overrides: Partial<StoFleet> = {},
): ResolvedStoFleet {
  const resolved = governanceFleet(reader);

  return {
    ...resolved,
    fleet: {
      ...resolved.fleet,
      // A trailing space, which is part of the name.
      exactGameName: 'Ninth Fleet ',
      allegianceFactionId: 'faction-federation',
      recruitmentState: FleetRecruitmentState.APPLICATION,
      visibility: FleetAudience.PUBLIC,
      platformSegment: 'pc',
      revision: 2,
      ...overrides,
    },
  };
}

/**
 * A refusal from the server.
 *
 * @param status - The status.
 * @param message - The server's sentence, if any.
 * @returns The error.
 */
function refusal(status: number, message?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: message === undefined ? null : { message },
  });
}

describe('ScopeSettingsComponent', () => {
  let fixture: ComponentFixture<ScopeSettingsComponent>;
  let route: GovernanceRouteStubs;
  let registration: { updateCommunity: jest.Mock; updateFleet: jest.Mock };
  let lookup: { getGeneralFactions: jest.Mock };
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, and where.
   * @param record - Fields of the Community or Fleet to override.
   * @param params - The address, where it is not the usual one.
   */
  async function render(
    reader: GovernanceReader = OWNER,
    record: Partial<FleetCommunity & StoFleet> = {},
    params?: Record<string, string>,
  ): Promise<void> {
    route = governanceRoute(reader, {});
    route.scopes.resolveCommunity.mockReturnValue(
      of(communityFor(reader, record)),
    );
    route.scopes.resolveFleet.mockReturnValue(of(fleetFor(reader, record)));

    if (params !== undefined) {
      route.params$.next(convertToParamMap(params));
    }

    await TestBed.configureTestingModule({
      imports: [ScopeSettingsComponent],
      providers: [
        ...route.providers,
        { provide: FleetRegistrationService, useValue: registration },
        { provide: CharacterLookupService, useValue: lookup },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(ScopeSettingsComponent);
    fixture.detectChanges();
  }

  /**
   * A field on the page.
   *
   * @param selector - The field.
   * @returns The field.
   */
  function field(
    selector: string,
  ): HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement;
  }

  /**
   * A link on the page, by its text.
   *
   * @param text - What it says.
   * @returns Where it goes.
   */
  function hrefOf(text: string): string | null | undefined {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    )
      .find(link => String(link.textContent).trim() === text)
      ?.getAttribute('href');
  }

  /** Sends the form, as Enter in a field would. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    registration = {
      updateCommunity: jest.fn((_id: string, changes: object) =>
        of({ ...communityFor(OWNER).community, ...changes }),
      ),
      updateFleet: jest.fn(() => of(fleetFor(FLEET_OWNER).fleet)),
    };
    lookup = {
      getGeneralFactions: jest.fn(() =>
        of([
          { id: 'faction-federation', name: 'Federation' },
          { id: 'faction-klingon', name: 'Klingon Empire' },
        ]),
      ),
    };
  });

  describe('a Community', () => {
    it('fills the form in from the Community as it stands', async () => {
      await render();

      expect(route.scopes.resolveCommunity).toHaveBeenCalledWith(
        'united-federation-alliance',
      );
      expect(pageText(fixture)).toContain('Settings');
      expect(pageText(fixture)).toContain('United Federation Alliance');
      expect(hrefOf('Back to Manage')).toBe(
        '/fleets/communities/united-federation-alliance/manage',
      );
      expect(field('#settings-name').value).toBe('United Federation Alliance');
      expect(field('#settings-slug').value).toBe('united-federation-alliance');
      expect(field('#settings-description').value).toBe(
        'Fleets flying together.',
      );
      expect(field('#settings-recruitment').value).toBe('APPLICATION');
      expect(field('#settings-visibility').value).toBe('PUBLIC');
      expect(field('#settings-timezone').value).toBe('UTC');
      expect(pageText(fixture)).toContain('Show dates in');
      expect(pageText(fixture)).toContain(
        'The old address keeps working and leads to the new one.',
      );
      // A Community has no allegiance, and the list is never asked for.
      expect(field('#settings-allegiance')).toBeNull();
      expect(lookup.getGeneralFactions).not.toHaveBeenCalled();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
      ).toBeNull();
    });

    it('says who each members audience means for a Community', async () => {
      await render();

      expect(field('#settings-visibility-hint').textContent?.trim()).toBe(
        COMMUNITY_AUDIENCE_HINT,
      );
      // FC-050: both audiences count the members of the Community's Fleets.
      expect(COMMUNITY_AUDIENCE_HINT).toContain('the members of its Fleets');
      expect(
        field('#settings-visibility').getAttribute('aria-describedby'),
      ).toBe('settings-visibility-hint');
    });

    it('offers its own timezone even where the browser does not list it', async () => {
      await render(OWNER, { preferredTimezone: 'Starbase/Deep_Space_Nine' });

      expect(field('#settings-timezone').value).toBe(
        'Starbase/Deep_Space_Nine',
      );
      expect(field('#settings-timezone').options[0].value).toBe(
        'Starbase/Deep_Space_Nine',
      );
    });

    it('sends only what changed, with the revision read, and reads it again', async () => {
      await render();

      typeInto(fixture, '#settings-description', ' Still flying. ');
      chooseFrom(fixture, '#settings-visibility', 'COMMUNITY');
      chooseFrom(fixture, '#settings-recruitment', 'CLOSED');
      chooseFrom(fixture, '#settings-timezone', 'Europe/London');
      submit();

      expect(registration.updateCommunity).toHaveBeenCalledWith('community-1', {
        description: 'Still flying.',
        visibility: FleetAudience.COMMUNITY,
        recruitmentState: FleetRecruitmentState.CLOSED,
        preferredTimezone: 'Europe/London',
        revision: 4,
      });
      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_SAVED);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'app-lcars-success-message',
        ),
      ).not.toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      expect(route.scopes.resolveCommunity).toHaveBeenCalledTimes(4);
    });

    it('follows a rename to its new address', async () => {
      await render();

      typeInto(fixture, '#settings-name', '  The Alliance ');
      registration.updateCommunity.mockReturnValue(
        of({ ...communityFor(OWNER).community, slug: 'the-alliance' }),
      );
      submit();

      expect(registration.updateCommunity).toHaveBeenCalledWith('community-1', {
        name: 'The Alliance',
        revision: 4,
      });
      expect(navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'the-alliance',
        'manage',
        'settings',
      ]);
      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_MOVED);
      // Only a Fleet's name has to match its roster exports.
      expect(pageText(fixture)).not.toContain('Former names');
    });

    it('says so when nothing has changed, and sends nothing', async () => {
      await render();

      submit();

      expect(registration.updateCommunity).not.toHaveBeenCalled();
      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_UNCHANGED);
    });

    it('asks for a name rather than sending spaces', async () => {
      await render();

      typeInto(fixture, '#settings-name', '   ');
      submit();

      expect(registration.updateCommunity).not.toHaveBeenCalled();
      expect(pageText(fixture)).toContain('Please give the Community a name.');
    });

    // Measured trimmed and in codepoints, as the server measures it.
    it('says a name is too long before sending it', async () => {
      await render();

      typeInto(fixture, '#settings-name', `  ${'a'.repeat(120)}  `);
      submit();

      expect(registration.updateCommunity).toHaveBeenCalled();

      typeInto(fixture, '#settings-name', 'b'.repeat(121));
      submit();

      expect(registration.updateCommunity).toHaveBeenCalledTimes(1);
      expect(pageText(fixture)).toContain(COMMUNITY_NAME_TOO_LONG);
    });

    it('holds the form while it saves', async () => {
      await render();

      registration.updateCommunity.mockReturnValue(NEVER);
      typeInto(fixture, '#settings-name', 'The Alliance');
      submit();
      submit();

      expect(registration.updateCommunity).toHaveBeenCalledTimes(1);
      expect(findButton(fixture, 'Save')?.disabled).toBe(true);
      expect(pageText(fixture)).toContain('Saving the settings');
    });

    it('offers to read it again when it changed meanwhile', async () => {
      await render();

      registration.updateCommunity.mockReturnValue(
        throwError(() =>
          refusal(
            409,
            'This Community has changed since you opened it. Reload and try again.',
          ),
        ),
      );
      typeInto(fixture, '#settings-name', 'The Alliance');
      submit();

      expect(pageText(fixture)).toContain(settingsStaleMessage('Community'));

      pressButton(fixture, 'Reload');

      expect(route.scopes.resolveCommunity).toHaveBeenCalledTimes(4);
      expect(pageText(fixture)).not.toContain('has changed since');
      expect(findButton(fixture, 'Reload')).toBeUndefined();
    });

    it('says when the web address was taken meanwhile', async () => {
      await render();

      registration.updateCommunity.mockReturnValue(
        throwError(() =>
          refusal(409, 'That web address has just been taken. Choose another.'),
        ),
      );
      typeInto(fixture, '#settings-slug', 'taken');
      submit();

      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_SLUG_TAKEN);
      expect(findButton(fixture, 'Reload')).toBeUndefined();
    });

    it.each([
      ['a conflict without a sentence', refusal(409)],
      ['a server that did not answer', refusal(500)],
      ['a failure that is not an HTTP one', new Error('offline')],
    ])('says so plainly for %s', async (_case, error) => {
      await render();

      registration.updateCommunity.mockReturnValue(throwError(() => error));
      typeInto(fixture, '#settings-name', 'The Alliance');
      submit();

      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_SAVE_FAILED);
    });

    it('gives the server’s reason for any other refusal', async () => {
      await render();

      registration.updateCommunity.mockReturnValue(
        throwError(() => refusal(400, 'name must be shorter')),
      );
      typeInto(fixture, '#settings-name', 'The Alliance');
      submit();

      expect(pageText(fixture)).toContain('name must be shorter');
    });

    it('says a closed Community cannot change, and offers no form', async () => {
      await render(OWNER, { status: FleetScopeStatus.CLOSED });

      expect(pageText(fixture)).toContain(
        'This Community is closed, so its settings can no longer be changed.',
      );
      expect(field('form')).toBeNull();
    });

    // A closed or suspended scope withdraws the capability; the Owner is
    // still let in, to be told why.
    it('says a suspended Community cannot change until it is reinstated', async () => {
      await render(
        { roles: ['OWNER'] },
        { status: FleetScopeStatus.SUSPENDED },
      );

      expect(pageText(fixture)).toContain(
        'This Community is suspended, so its settings cannot be changed ' +
          'until a site administrator reinstates it.',
      );
    });

    it('says an open Community cannot change when its Owner lacks the capability', async () => {
      await render({ roles: ['OWNER'] });

      expect(pageText(fixture)).toContain(COMMUNITY_SETTINGS_LOCKED);
      expect(field('form')).toBeNull();
    });

    it('opens to whoever holds the settings', async () => {
      await render({ capabilities: ['scope.settings.manage'] });

      expect(field('#settings-name')).not.toBeNull();
    });

    it('turns away an Admin', async () => {
      await render({ roles: ['ADMIN'] });

      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_NOT_PERMITTED);
      expect(field('form')).toBeNull();
    });

    it('asks for the Community with an empty segment when the address has none', async () => {
      await render(OWNER, {}, {});

      expect(route.scopes.resolveCommunity).toHaveBeenLastCalledWith('');
    });
  });

  describe('a Fleet', () => {
    it('fills the form in from the Fleet as it stands, its name exactly', async () => {
      await render(FLEET_OWNER);

      expect(route.scopes.resolveFleet).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'ninth-fleet',
      );
      expect(pageText(fixture)).toContain('Name, exactly as in game');
      expect(pageText(fixture)).toContain('spaces at either end included');
      expect(field('#settings-name').value).toBe('Ninth Fleet ');
      expect(field('#settings-allegiance').value).toBe('faction-federation');
      expect(field('#settings-allegiance').options).toHaveLength(3);
      expect(field('#settings-visibility').value).toBe('PUBLIC');
      // Neither is changed here.
      expect(field('#settings-recruitment')).toBeNull();
      expect(field('#settings-description')).toBeNull();
      // The audiences mean what they say at a Fleet.
      expect(field('#settings-visibility-hint')).toBeNull();
      expect(pageText(fixture)).toContain('Its platform, Windows, cannot be');
      expect(hrefOf('recruitment settings')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/recruitment/settings',
      );
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
      ).not.toBeNull();
    });

    it('offers "Not stated" alone when the allegiances cannot be read', async () => {
      lookup.getGeneralFactions.mockReturnValue(
        throwError(() => new Error('No token found')),
      );

      await render(FLEET_OWNER);

      expect(field('#settings-allegiance').options).toHaveLength(1);
    });

    it('renames it exactly as typed, follows it, and points at Former names', async () => {
      await render(FLEET_OWNER);

      typeInto(fixture, '#settings-name', ' Tenth Fleet');
      registration.updateFleet.mockReturnValue(
        of({ ...fleetFor(FLEET_OWNER).fleet, slug: 'tenth-fleet' }),
      );
      submit();

      expect(registration.updateFleet).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        { exactGameName: ' Tenth Fleet', revision: 2 },
      );
      expect(navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'united-federation-alliance',
        'fleets',
        'pc',
        'tenth-fleet',
        'manage',
        'settings',
      ]);
      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_MOVED);
      expect(pageText(fixture)).toContain(
        'Exports taken before the rename still carry the old name. Record ' +
          'it under Former names so they keep matching.',
      );
      expect(hrefOf('Former names')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/tenth-fleet/investigate/former-names',
      );
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.scope-settings__renamed app-fleet-exact-name',
        ),
      ).not.toBeNull();
    });

    it('keeps its address, and says nothing of Former names, when only its audience changes', async () => {
      await render(FLEET_OWNER);

      chooseFrom(fixture, '#settings-visibility', 'FLEET_MEMBERS');
      chooseFrom(fixture, '#settings-allegiance', '');
      submit();

      expect(registration.updateFleet).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        {
          allegianceFactionId: null,
          visibility: FleetAudience.FLEET_MEMBERS,
          revision: 2,
        },
      );
      expect(navigate).not.toHaveBeenCalled();
      expect(pageText(fixture)).toContain(SCOPE_SETTINGS_SAVED);
      expect(pageText(fixture)).not.toContain('Former names');
    });

    it('asks for its name rather than sending nothing', async () => {
      await render(FLEET_OWNER);

      typeInto(fixture, '#settings-name', '');
      submit();

      expect(registration.updateFleet).not.toHaveBeenCalled();
      expect(pageText(fixture)).toContain('Please give the Fleet its name.');
    });

    // Its edge spaces are stored, so they count.
    it('says a name is too long, counting its edge spaces', async () => {
      await render(FLEET_OWNER);

      typeInto(fixture, '#settings-name', ` ${'a'.repeat(64)}`);
      submit();

      expect(registration.updateFleet).not.toHaveBeenCalled();
      expect(pageText(fixture)).toContain(EXACT_GAME_NAME_TOO_LONG);
    });

    it('names the Fleet when it changed meanwhile', async () => {
      await render(FLEET_OWNER);

      registration.updateFleet.mockReturnValue(
        throwError(() =>
          refusal(
            409,
            'This Fleet has changed since you opened it. Reload and try again.',
          ),
        ),
      );
      chooseFrom(fixture, '#settings-visibility', 'PRIVATE');
      submit();

      expect(pageText(fixture)).toContain(settingsStaleMessage('Fleet'));
    });

    it('gives the server’s reason when its allegiance cannot change', async () => {
      await render(FLEET_OWNER);

      registration.updateFleet.mockReturnValue(
        throwError(() =>
          refusal(
            409,
            'This Fleet’s allegiance cannot change while it is in an Armada.',
          ),
        ),
      );
      chooseFrom(fixture, '#settings-allegiance', 'faction-klingon');
      submit();

      expect(pageText(fixture)).toContain(
        'This Fleet’s allegiance cannot change while it is in an Armada.',
      );
    });

    it('says a suspended Fleet cannot change until it is reinstated', async () => {
      await render(
        { ...FLEET_OWNER, capabilities: [] },
        { status: FleetScopeStatus.SUSPENDED },
      );

      expect(pageText(fixture)).toContain(
        'This Fleet is suspended, so its settings cannot be changed',
      );
    });

    it('says an open Fleet cannot change while its Community is not open', async () => {
      await render({ ...FLEET_OWNER, capabilities: [] });

      expect(pageText(fixture)).toContain(FLEET_SETTINGS_LOCKED);
    });
  });

  // An Armada's settings are its own, and are not changed here.
  it('turns away an Armada’s Owner', async () => {
    await render({ ...OWNER, onArmada: true });

    expect(pageText(fixture)).toContain(SCOPE_SETTINGS_NOT_PERMITTED);
  });
});
