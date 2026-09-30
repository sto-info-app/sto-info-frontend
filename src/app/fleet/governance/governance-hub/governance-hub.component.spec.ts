import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { convertToParamMap } from '@angular/router';

import { NEVER, Observable, of, throwError } from 'rxjs';

import { GOVERNANCE_MISSING } from 'src/app/fleet/governance/governance-page.directive';
import {
  governanceCommunity,
  GovernanceReader,
  governanceRoute,
  GovernanceRouteStubs,
} from 'src/app/fleet/governance/governance.testing';
import {
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';

import {
  GOVERNANCE_ARMADA_CLOSED,
  GOVERNANCE_CLOSE_FAILED,
  GOVERNANCE_CLOSED,
  GOVERNANCE_HUB_NOT_PERMITTED,
  GovernanceHubComponent,
} from './governance-hub.component';

describe('GovernanceHubComponent', () => {
  let fixture: ComponentFixture<GovernanceHubComponent>;
  let governance: { close: jest.Mock; resolveCommunityAsSiteAdmin: jest.Mock };
  let dialog: { open: jest.Mock };

  /**
   * Draws the hub.
   *
   * @param reader - Who is reading, and where.
   * @param params - The address, when not the reader's usual one.
   * @param arrange - Changes to the stubs before the hub is first drawn.
   */
  async function render(
    reader: GovernanceReader,
    params?: Record<string, string>,
    arrange?: (route: GovernanceRouteStubs) => void,
  ): Promise<GovernanceRouteStubs> {
    const route = governanceRoute(reader, governance);

    if (params !== undefined) {
      route.params$.next(convertToParamMap(params));
    }

    arrange?.(route);

    await TestBed.configureTestingModule({
      imports: [GovernanceHubComponent],
      providers: [...route.providers, { provide: MatDialog, useValue: dialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceHubComponent);
    fixture.detectChanges();

    return route;
  }

  /**
   * The hub's links, by label.
   *
   * @returns Each link's label and address.
   */
  function links(): Record<string, string | null> {
    return Object.fromEntries(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.governance-hub__item a',
        ),
      ).map(link => [
        String(link.textContent).trim(),
        link.getAttribute('href'),
      ]),
    );
  }

  /**
   * Makes the dialog answer.
   *
   * @param answer - What it closes with.
   */
  function dialogAnswers(answer: unknown): void {
    dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
  }

  beforeEach(() => {
    governance = {
      close: jest.fn(() => of(undefined)),
      resolveCommunityAsSiteAdmin: jest.fn(() => of(governanceCommunity({}))),
    };
    dialog = { open: jest.fn() };
    dialogAnswers({ reason: 'Merged.' });
  });

  it('offers the Owner everything on the Community', async () => {
    await render({ roles: ['OWNER'], capabilities: ['scope.close'] });

    const base = '/fleets/communities/united-federation-alliance/manage';

    expect(links()).toEqual({
      Roles: `${base}/roles`,
      Delegation: `${base}/delegation`,
      History: `${base}/history`,
      Ownership: `${base}/ownership`,
    });
    expect(pageText(fixture)).toContain('Appoint United Federation Alliance’s');
    expect(pageText(fixture)).toContain('Back to United Federation Alliance');
    expect(pageText(fixture)).toContain('Close this Community');
  });

  it('offers an Admin the pages to read, and neither ownership nor closing', async () => {
    await render({ roles: ['ADMIN'] });

    expect(Object.keys(links())).toEqual(['Roles', 'Delegation', 'History']);
    expect(pageText(fixture)).toContain('See who holds a role');
    expect(pageText(fixture)).toContain('See what Officers');
    expect(pageText(fixture)).not.toContain('Close this');
  });

  it('offers a site administrator the dispute page alone', async () => {
    await render({ isSiteAdmin: true });

    expect(links()).toEqual({
      'Site administration':
        '/fleets/communities/united-federation-alliance/manage/dispute',
    });
  });

  it('offers a Fleet’s Owner no ownership, and draws its tabs', async () => {
    await render({
      onFleet: true,
      roles: ['OWNER'],
      capabilities: ['scope.close'],
    });

    expect(Object.keys(links())).toEqual(['Roles', 'Delegation', 'History']);
    expect(links()['Roles']).toBe(
      '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/manage/roles',
    );
    expect(pageText(fixture)).toContain('Close this Fleet');
    expect(pageText(fixture)).not.toContain('Back to');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
    ).not.toBeNull();
  });

  // An Armada is governed as a Fleet is, from the same pages, told by the
  // route which kind of scope it is, and closed from here too (FC-050).
  it('offers an Armada’s Owner its pages and closing, and no ownership', async () => {
    await render({
      onArmada: true,
      roles: ['OWNER'],
      capabilities: ['scope.close'],
    });

    const base =
      '/fleets/communities/united-federation-alliance/armadas/pc/sol-armada/manage';

    expect(links()).toEqual({
      Roles: `${base}/roles`,
      Delegation: `${base}/delegation`,
      History: `${base}/history`,
    });
    expect(pageText(fixture)).toContain('Sol Armada');
    expect(pageText(fixture)).toContain('Close this Armada');
    expect(pageText(fixture)).toContain('takes every Fleet out of it');
    expect(pageText(fixture)).toContain('asked for its name and a reason.');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-armada-tabs'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
    ).toBeNull();
  });

  // Its own settings are the Owner's alone and not delegable, so they are
  // offered to whoever the server says holds them, first.
  it('offers a Community’s settings to whoever holds them', async () => {
    await render({
      roles: ['OWNER'],
      capabilities: ['scope.settings.manage'],
    });

    expect(Object.keys(links())[0]).toBe('Settings');
    expect(links()['Settings']).toBe(
      '/fleets/communities/united-federation-alliance/manage/settings',
    );
    expect(pageText(fixture)).toContain(
      'Rename United Federation Alliance, and change its description',
    );
  });

  it('offers a Fleet’s settings to whoever holds them', async () => {
    await render({
      onFleet: true,
      roles: ['OWNER'],
      capabilities: ['scope.settings.manage'],
    });

    expect(links()['Settings']).toBe(
      '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/manage/settings',
    );
    expect(pageText(fixture)).toContain(
      'Rename Ninth Fleet to follow the game',
    );
  });

  it('offers no settings on an Armada, whoever holds them', async () => {
    await render({
      onArmada: true,
      roles: ['OWNER'],
      capabilities: ['scope.settings.manage'],
    });

    expect(links()['Settings']).toBeUndefined();
  });

  it('offers an Armada’s Admin no closing', async () => {
    await render({ onArmada: true, roles: ['ADMIN'] });

    expect(Object.keys(links())).toEqual(['Roles', 'Delegation', 'History']);
    expect(pageText(fixture)).not.toContain('Close this');
  });

  it('says a closed Armada is closed, and offers no closing', async () => {
    await render({
      onArmada: true,
      roles: ['OWNER'],
      capabilities: ['scope.close'],
      closed: true,
    });

    expect(pageText(fixture)).toContain('This Armada is closed.');
    expect(pageText(fixture)).not.toContain('Close this');
  });

  it('asks for an Armada with empty segments when the address has none', async () => {
    const route = await render({ onArmada: true, roles: ['OWNER'] }, {});

    expect(route.scopes.resolveArmada).toHaveBeenCalledWith('', '', '');
  });

  it('turns away a reader holding no role in an Armada', async () => {
    await render({ onArmada: true });

    expect(links()).toEqual({});
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-armada-tabs'),
    ).not.toBeNull();
  });

  it('turns away a site administrator on a Fleet with no role in it', async () => {
    await render({ onFleet: true, isSiteAdmin: true });

    expect(pageText(fixture)).toContain(GOVERNANCE_HUB_NOT_PERMITTED);
  });

  it('turns away a member with no role that reads it', async () => {
    await render({ roles: ['OFFICER'] });

    expect(pageText(fixture)).toContain(GOVERNANCE_HUB_NOT_PERMITTED);
  });

  it('says a closed scope is closed, and offers no closing', async () => {
    await render({
      roles: ['OWNER'],
      capabilities: ['scope.close'],
      closed: true,
    });

    expect(pageText(fixture)).toContain('This Community is closed.');
    expect(pageText(fixture)).toContain('See who holds a role');
    expect(pageText(fixture)).toContain('See what Officers');
    expect(pageText(fixture)).not.toContain('Close this');
  });

  // Steve's decision of 30 September 2026: a site administrator reaches any
  // Community's dispute page, and this hub that leads to it, whoever may see
  // the Community; nobody else gains anything.
  describe('whoever may see the Community (FC-050)', () => {
    /** The public read's answer to a reader it hides a Community from. */
    const hidden = (): Observable<never> =>
      throwError(
        () => new HttpErrorResponse({ status: HttpStatusCode.NotFound }),
      );

    it('finds it for a site administrator through their own read, and offers the dispute page', async () => {
      const route = await render({ isSiteAdmin: true }, undefined, stubs =>
        stubs.scopes.resolveCommunity.mockReturnValue(hidden()),
      );

      expect(governance.resolveCommunityAsSiteAdmin).toHaveBeenCalledWith(
        'united-federation-alliance',
      );
      expect(route.scopes.resolveCommunity).not.toHaveBeenCalled();
      expect(links()).toEqual({
        'Site administration':
          '/fleets/communities/united-federation-alliance/manage/dispute',
      });
    });

    it('says nothing answers when no Community does, even to a site administrator', async () => {
      governance.resolveCommunityAsSiteAdmin.mockReturnValue(hidden());
      await render({ isSiteAdmin: true });

      expect(pageText(fixture)).toContain(GOVERNANCE_MISSING);
      expect(links()).toEqual({});
    });

    it('still asks the public read for an Owner who is not a site administrator', async () => {
      const route = await render({ roles: ['OWNER'] });

      expect(route.scopes.resolveCommunity).toHaveBeenCalledWith(
        'united-federation-alliance',
      );
      expect(governance.resolveCommunityAsSiteAdmin).not.toHaveBeenCalled();
      expect(links()['Site administration']).toBeUndefined();
    });

    it('shows nothing of a Community the public read hides from anybody else', async () => {
      await render({ roles: [] }, undefined, stubs =>
        stubs.scopes.resolveCommunity.mockReturnValue(hidden()),
      );

      expect(pageText(fixture)).toContain(GOVERNANCE_MISSING);
      expect(pageText(fixture)).not.toContain('United Federation Alliance');
      expect(governance.resolveCommunityAsSiteAdmin).not.toHaveBeenCalled();
      expect(links()).toEqual({});
    });

    it('finds a Fleet as before, even for a site administrator', async () => {
      const route = await render({ onFleet: true, isSiteAdmin: true });

      expect(route.scopes.resolveFleet).toHaveBeenCalled();
      expect(governance.resolveCommunityAsSiteAdmin).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('asks for the name and a reason, then closes', async () => {
      await render({ roles: ['OWNER'], capabilities: ['scope.close'] });
      pressButton(fixture, 'Close…');

      expect(dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: {
          scopeNoun: 'Community',
          name: 'United Federation Alliance',
          asSiteAdmin: false,
        },
      });
      expect(governance.close).toHaveBeenCalledWith(
        { communityId: 'community-1', fleetId: null },
        'Merged.',
      );
      expect(pageText(fixture)).toContain(GOVERNANCE_CLOSED);
    });

    it('names a Fleet as a Fleet', async () => {
      await render({
        onFleet: true,
        roles: ['OWNER'],
        capabilities: ['scope.close'],
      });
      pressButton(fixture, 'Close…');

      expect(dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: { scopeNoun: 'Fleet', name: 'Ninth Fleet' },
      });
      expect(governance.close).toHaveBeenCalledWith(
        { communityId: 'community-1', fleetId: 'fleet-1' },
        'Merged.',
      );
    });

    it('closes an Armada with its name and a reason (FC-050)', async () => {
      const route = await render({
        onArmada: true,
        roles: ['OWNER'],
        capabilities: ['scope.close'],
      });
      pressButton(fixture, 'Close…');

      expect(dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: {
          scopeNoun: 'Armada',
          name: 'Sol Armada',
          asSiteAdmin: false,
        },
      });
      expect(governance.close).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'community-1',
          armadaId: 'armada-1',
        }),
        'Merged.',
      );
      expect(pageText(fixture)).toContain(GOVERNANCE_ARMADA_CLOSED);
      expect(route.scopes.resolveArmada).toHaveBeenCalledTimes(2);
    });

    it('gives the server’s reason when an Armada’s closure is refused', async () => {
      governance.close.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'Insufficient permissions' },
            }),
        ),
      );
      await render({
        onArmada: true,
        roles: ['OWNER'],
        capabilities: ['scope.close'],
      });
      pressButton(fixture, 'Close…');

      expect(pageText(fixture)).toContain('Insufficient permissions');
      expect(pageText(fixture)).not.toContain(GOVERNANCE_ARMADA_CLOSED);
    });

    it('closes nothing when the dialog is dismissed', async () => {
      dialogAnswers(undefined);
      await render({ roles: ['OWNER'], capabilities: ['scope.close'] });
      pressButton(fixture, 'Close…');

      expect(governance.close).not.toHaveBeenCalled();
    });

    it('holds the button while it closes', async () => {
      governance.close.mockReturnValue(NEVER);
      await render({ roles: ['OWNER'], capabilities: ['scope.close'] });
      pressButton(fixture, 'Close…');

      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '.governance-hub__close button',
          ) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it('gives the server’s reason for a refusal', async () => {
      governance.close.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'Only the Owner may close it.' },
            }),
        ),
      );
      await render({ roles: ['OWNER'], capabilities: ['scope.close'] });
      pressButton(fixture, 'Close…');

      expect(pageText(fixture)).toContain('Only the Owner may close it.');
    });

    it('says so plainly when it fails otherwise', async () => {
      governance.close.mockReturnValue(throwError(() => new Error('down')));
      await render({ roles: ['OWNER'], capabilities: ['scope.close'] });
      pressButton(fixture, 'Close…');

      expect(pageText(fixture)).toContain(GOVERNANCE_CLOSE_FAILED);
    });
  });
});
