import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import {
  HIDDEN_ARMADA_FLEET,
  armadaFleet,
  armadaRef,
  armadaRequest,
} from 'src/app/fleet/armadas/armada.testing';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ArmadaPosition,
  FleetArmadaView,
  FleetPlacement,
} from 'src/app/models/fleet-armada.models';

import {
  FLEET_ARMADA_MOVE_FAILED,
  FleetArmadaMoveComponent,
} from './fleet-armada-move.component';

/**
 * Builds a Fleet's Armada as the server answers it.
 *
 * @param overrides - Fields to override.
 * @returns A Fleet in no Armada, which the reader may do nothing about.
 */
function fleetView(overrides: Partial<FleetArmadaView> = {}): FleetArmadaView {
  return {
    placement: null,
    mayRequest: false,
    openRequest: null,
    lastAnswered: null,
    choices: [],
    cannotRequestBecause: null,
    ...overrides,
  };
}

/**
 * Places the Fleet.
 *
 * @param overrides - Fields to override.
 * @returns The Ninth Fleet as a Beta of the Sol Armada.
 */
function placement(overrides: Partial<FleetPlacement> = {}): FleetPlacement {
  return {
    armada: armadaRef(),
    position: ArmadaPosition.BETA,
    parent: null,
    since: '2026-09-20T10:00:00.000Z',
    gammaCount: 0,
    ...overrides,
  };
}

/** Another Armada the Fleet could move to. */
const OTHER = armadaRef({
  id: 'armada-2',
  name: 'Vega Armada',
  slug: 'vega-armada',
});

describe('FleetArmadaMoveComponent (FC-057)', () => {
  let fixture: ComponentFixture<FleetArmadaMoveComponent>;
  let service: {
    fleetView: jest.Mock;
    request: jest.Mock;
    withdraw: jest.Mock;
  };

  /**
   * Draws the panel.
   *
   * @param view - What the server answers.
   */
  function render(view: FleetArmadaView): void {
    service.fleetView.mockReturnValue(of(view));
    TestBed.configureTestingModule({
      imports: [FleetArmadaMoveComponent],
      providers: [
        provideRouter([]),
        { provide: FleetArmadaService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(FleetArmadaMoveComponent);
    fixture.componentRef.setInput('communityId', 'community-1');
    fixture.componentRef.setInput('fleetId', 'fleet-1');
    fixture.componentRef.setInput('fleetName', 'Ninth Fleet');
    fixture.componentRef.setInput(
      'communitySlug',
      'united-federation-alliance',
    );
    fixture.componentRef.setInput('platformSegment', 'pc');
    fixture.componentRef.setInput('fleetSlug', 'ninth-fleet');
    fixture.detectChanges();
  }

  /**
   * Finds an element.
   *
   * @param selector - The selector.
   * @returns The element, or null.
   */
  function find(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  /** Submits the open form. */
  function submit(): void {
    (find('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = {
      fleetView: jest.fn(),
      request: jest.fn(() =>
        of(
          fleetView({
            mayRequest: true,
            placement: placement(),
            openRequest: armadaRequest({ armada: OTHER }),
          }),
        ),
      ),
      withdraw: jest.fn(() =>
        of(
          fleetView({
            mayRequest: true,
            placement: placement(),
            choices: [OTHER],
          }),
        ),
      ),
    };
  });

  it('reads the Fleet’s Armada', () => {
    render(fleetView());

    expect(service.fleetView).toHaveBeenCalledWith('community-1', 'fleet-1');
  });

  it('sends a Fleet in no Armada to its own page to join one', () => {
    render(fleetView({ mayRequest: true }));

    expect(pageText(fixture)).toContain('Not in an Armada.');
    expect(
      find(
        'a[href="/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet"]',
      ),
    ).not.toBeNull();
    expect(find('form')).toBeNull();
  });

  it('says where the Fleet sits, and that moving is for its managers', () => {
    render(fleetView({ placement: placement() }));

    expect(pageText(fixture)).toContain('In Sol Armada as Beta');
    expect(pageText(fixture)).toContain(
      'Asking to move it is for the Fleet’s managers.',
    );
    expect(find('form')).toBeNull();
  });

  it('names and links the Fleet a Gamma sits under', () => {
    render(
      fleetView({
        placement: placement({
          position: ArmadaPosition.GAMMA,
          parent: armadaFleet('First Fleet'),
        }),
      }),
    );

    expect(pageText(fixture)).toContain(
      'In Sol Armada as Gamma under First Fleet',
    );
    expect(
      find(
        'a[href="/fleets/communities/united-federation-alliance/fleets/pc/first-fleet"]',
      )?.textContent,
    ).toBe('First Fleet');
  });

  it('says a Gamma sits under a Fleet the reader cannot see, unlinked', () => {
    render(
      fleetView({
        placement: placement({
          position: ArmadaPosition.GAMMA,
          parent: HIDDEN_ARMADA_FLEET,
        }),
      }),
    );

    expect(pageText(fixture)).toContain(
      'as Gamma under A Fleet you cannot see',
    );
    expect(find('a[href*="/fleets/pc/"]')).toBeNull();
  });

  it('offers the other Armadas, and asks to move with a message', () => {
    render(
      fleetView({ mayRequest: true, placement: placement(), choices: [OTHER] }),
    );

    expect(pageText(fixture)).toContain(
      'The Fleet stays in Sol Armada while the request waits.',
    );
    expect(findButton(fixture, 'Ask to move')?.disabled).toBe(true);

    chooseFrom(fixture, '#fleet-armada-move-choice', 'armada-2');
    typeInto(fixture, '#fleet-armada-move-message', '  Closer to our allies  ');
    submit();

    expect(service.request).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'armada-2',
      'Closer to our allies',
    );
    expect(pageText(fixture)).toContain(
      'The Fleet stays where it is until they approve it.',
    );
    expect(pageText(fixture)).toContain(
      'You have asked to move it to Vega Armada.',
    );
  });

  it('sends nothing without an Armada chosen', () => {
    render(
      fleetView({ mayRequest: true, placement: placement(), choices: [OTHER] }),
    );

    submit();

    expect(service.request).not.toHaveBeenCalled();
  });

  it('says when nowhere would take it', () => {
    render(fleetView({ mayRequest: true, placement: placement() }));

    expect(pageText(fixture)).toContain('nowhere to move it to');
    expect(find('form')).toBeNull();
  });

  it('says why the Fleet cannot ask', () => {
    render(
      fleetView({
        mayRequest: true,
        placement: placement(),
        cannotRequestBecause: 'Set its allegiance first.',
      }),
    );

    expect(pageText(fixture)).toContain('Set its allegiance first.');
  });

  it('shows an open move and withdraws it', () => {
    render(
      fleetView({
        mayRequest: true,
        placement: placement(),
        openRequest: armadaRequest({ armada: OTHER }),
      }),
    );

    expect(pageText(fixture)).toContain(
      'You have asked to move it to Vega Armada.',
    );
    expect(pageText(fixture)).toContain(
      'It stays here while the request waits',
    );

    pressButton(fixture, 'Withdraw the request');

    expect(service.withdraw).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'request-1',
    );
    expect(pageText(fixture)).toContain('Your request was withdrawn.');
    expect(find('#fleet-armada-move-choice')).not.toBeNull();
  });

  it('shows the server’s refusal, and a failure it cannot explain plainly', () => {
    service.request.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'This Fleet already has an open request.' },
          }),
      ),
    );
    render(
      fleetView({ mayRequest: true, placement: placement(), choices: [OTHER] }),
    );
    chooseFrom(fixture, '#fleet-armada-move-choice', 'armada-2');
    submit();

    expect(pageText(fixture)).toContain(
      'This Fleet already has an open request.',
    );

    service.request.mockReturnValue(throwError(() => new Error('down')));
    submit();

    expect(pageText(fixture)).toContain(FLEET_ARMADA_MOVE_FAILED);
    expect(fixture.componentInstance.busy()).toBe(false);
  });

  it('shows nothing when the Armada cannot be read', () => {
    service.fleetView.mockReturnValue(throwError(() => new Error('down')));
    TestBed.configureTestingModule({
      imports: [FleetArmadaMoveComponent],
      providers: [
        provideRouter([]),
        { provide: FleetArmadaService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(FleetArmadaMoveComponent);
    fixture.componentRef.setInput('communityId', 'community-1');
    fixture.componentRef.setInput('fleetId', 'fleet-1');
    fixture.componentRef.setInput('fleetName', 'Ninth Fleet');
    fixture.componentRef.setInput(
      'communitySlug',
      'united-federation-alliance',
    );
    fixture.componentRef.setInput('platformSegment', 'pc');
    fixture.componentRef.setInput('fleetSlug', 'ninth-fleet');
    fixture.detectChanges();

    expect(find('app-lcars-panel')).toBeNull();
  });
});
