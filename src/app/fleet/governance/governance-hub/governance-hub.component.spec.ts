import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { convertToParamMap } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import {
  GovernanceReader,
  governanceRoute,
  GovernanceRouteStubs,
} from 'src/app/fleet/governance/governance.testing';
import {
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';

import {
  GOVERNANCE_CLOSE_FAILED,
  GOVERNANCE_CLOSED,
  GOVERNANCE_HUB_NOT_PERMITTED,
  GovernanceHubComponent,
} from './governance-hub.component';

describe('GovernanceHubComponent', () => {
  let fixture: ComponentFixture<GovernanceHubComponent>;
  let governance: { close: jest.Mock };
  let dialog: { open: jest.Mock };

  /**
   * Draws the hub.
   *
   * @param reader - Who is reading, and where.
   */
  async function render(
    reader: GovernanceReader,
    params?: Record<string, string>,
  ): Promise<GovernanceRouteStubs> {
    const route = governanceRoute(reader, governance);

    if (params !== undefined) {
      route.params$.next(convertToParamMap(params));
    }

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
    governance = { close: jest.fn(() => of(undefined)) };
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
  // route which kind of scope it is. It is closed from its Community.
  it('offers an Armada’s Owner its pages, and neither ownership nor closing', async () => {
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
    expect(pageText(fixture)).not.toContain('Close this');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-armada-tabs'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-fleet-tabs'),
    ).toBeNull();
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
