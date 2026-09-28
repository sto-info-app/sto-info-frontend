import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import {
  armadaFleet,
  armadaRef,
  armadaRequest,
  HIDDEN_ARMADA_FLEET,
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
  ArmadaRequestStatus,
  FleetArmadaView,
  FleetPlacement,
} from 'src/app/models/fleet-armada.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  FLEET_ARMADA_FAILED,
  FleetArmadaPanelComponent,
} from './fleet-armada-panel.component';

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

const ARMADA_HREF =
  '/fleets/communities/united-federation-alliance/armadas/pc/sol-armada';

describe('FleetArmadaPanelComponent', () => {
  let fixture: ComponentFixture<FleetArmadaPanelComponent>;
  let service: {
    fleetView: jest.Mock;
    request: jest.Mock;
    withdraw: jest.Mock;
    leave: jest.Mock;
  };
  let confirm: ConfirmPromptDouble;

  /**
   * Draws the panel.
   *
   * @param view - What the server answers.
   */
  function render(view: FleetArmadaView): void {
    service.fleetView.mockReturnValue(of(view));
    TestBed.configureTestingModule({
      imports: [FleetArmadaPanelComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: FleetArmadaService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(FleetArmadaPanelComponent);
    fixture.componentRef.setInput('vm', {
      communityId: 'community-1',
      fleetId: 'fleet-1',
      fleetName: 'Ninth Fleet',
      communitySlug: 'united-federation-alliance',
    });
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
      // A reader who may ask still may afterwards.
      request: jest.fn(() => of(fleetView({ mayRequest: true }))),
      withdraw: jest.fn(() => of(fleetView({ mayRequest: true }))),
      leave: jest.fn(() => of(fleetView({ mayRequest: true }))),
    };
    confirm = stubConfirmPrompt();
  });

  describe('for any reader', () => {
    it('reads the Fleet’s Armada', () => {
      render(fleetView());

      expect(service.fleetView).toHaveBeenCalledWith('community-1', 'fleet-1');
    });

    it('shows nothing for a Fleet in none, to a reader who can do nothing', () => {
      render(fleetView());

      expect(find('section')).toBeNull();
    });

    it('shows nothing when the Armada cannot be read', () => {
      service.fleetView.mockReturnValue(throwError(() => new Error('down')));
      TestBed.configureTestingModule({
        imports: [FleetArmadaPanelComponent],
        providers: [
          provideRouter([]),
          confirm.provider,
          { provide: FleetArmadaService, useValue: service },
        ],
      });
      fixture = TestBed.createComponent(FleetArmadaPanelComponent);
      fixture.componentRef.setInput('vm', {
        communityId: 'community-1',
        fleetId: 'fleet-1',
        fleetName: 'Ninth Fleet',
        communitySlug: 'united-federation-alliance',
      });
      fixture.detectChanges();

      expect(find('section')).toBeNull();
    });

    it('says where the Fleet sits, linking its Armada', () => {
      render(fleetView({ placement: placement() }));

      expect(pageText(fixture)).toContain(
        'In Sol Armada as Beta since Sep 20, 2026.',
      );
      expect(find('a')?.getAttribute('href')).toBe(ARMADA_HREF);
      expect(findButton(fixture, 'Leave the Armada…')).toBeUndefined();
    });

    it('names and links the Beta a Gamma sits under', () => {
      render(
        fleetView({
          placement: placement({
            position: ArmadaPosition.GAMMA,
            parent: armadaFleet('Tenth Fleet'),
          }),
        }),
      );

      expect(pageText(fixture)).toContain('as Gamma under Tenth Fleet');
      expect(find('a[href$="/tenth-fleet"]')).not.toBeNull();
    });

    it('names a hidden Beta without linking it', () => {
      render(
        fleetView({
          placement: placement({
            position: ArmadaPosition.GAMMA,
            parent: HIDDEN_ARMADA_FLEET,
          }),
        }),
      );

      expect(pageText(fixture)).toContain('under A Fleet you cannot see');
      expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(1);
    });
  });

  describe('asking to join', () => {
    const MAY_ASK = fleetView({
      mayRequest: true,
      choices: [armadaRef(), armadaRef({ id: 'armada-2', name: 'Kor Armada' })],
    });

    it('says why the Fleet cannot ask', () => {
      render(
        fleetView({
          mayRequest: true,
          cannotRequestBecause: 'Choose the Fleet’s allegiance first.',
        }),
      );

      expect(pageText(fixture)).toContain(
        'Not in an Armada. Choose the Fleet’s allegiance first.',
      );
      expect(find('form')).toBeNull();
    });

    it('says when no Armada would take it', () => {
      render(fleetView({ mayRequest: true }));

      expect(pageText(fixture)).toContain(
        'No open Armada in this Community takes Fleets',
      );
    });

    it('needs an Armada, then asks with the message and says so', () => {
      render(MAY_ASK);

      expect(
        (find('button[type="submit"]') as HTMLButtonElement).disabled,
      ).toBe(true);

      chooseFrom(fixture, '#fleet-armada-choice', 'armada-2');
      typeInto(fixture, '#fleet-armada-message', '  Hello  ');
      submit();

      expect(service.request).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'armada-2',
        'Hello',
      );
      expect(find('[role="status"]')?.textContent).toContain(
        'Your request is on its way to the Armada’s managers.',
      );
      expect(fixture.componentInstance.armadaId()).toBe('');
      expect(fixture.componentInstance.message()).toBe('');
    });

    it('sends no message when none was typed', () => {
      render(MAY_ASK);
      chooseFrom(fixture, '#fleet-armada-choice', 'armada-1');
      submit();

      expect(service.request).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'armada-1',
        null,
      );
    });

    it('sends nothing without an Armada chosen', () => {
      render(MAY_ASK);
      submit();

      expect(service.request).not.toHaveBeenCalled();
    });

    it('shows the server’s refusal', () => {
      service.request.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'This Fleet already has a request open.' },
            }),
        ),
      );
      render(MAY_ASK);
      chooseFrom(fixture, '#fleet-armada-choice', 'armada-1');
      submit();

      expect(pageText(fixture)).toContain(
        'This Fleet already has a request open.',
      );
      expect(fixture.componentInstance.busy()).toBe(false);
    });

    it('says a failure it cannot explain plainly', () => {
      service.request.mockReturnValue(throwError(() => new Error('down')));
      render(MAY_ASK);
      chooseFrom(fixture, '#fleet-armada-choice', 'armada-1');
      submit();

      expect(pageText(fixture)).toContain(FLEET_ARMADA_FAILED);
    });
  });

  describe('an open request', () => {
    it('says when it lapses, and withdraws it', () => {
      render(fleetView({ mayRequest: true, openRequest: armadaRequest() }));

      expect(pageText(fixture)).toContain('You have asked to join Sol Armada.');
      expect(pageText(fixture)).toContain('waits for its managers until');

      pressButton(fixture, 'Withdraw the request');

      expect(service.withdraw).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'request-1',
      );
      expect(pageText(fixture)).toContain('Your request was withdrawn.');
    });
  });

  describe('the last answer', () => {
    it('says how it was answered, and why', () => {
      render(
        fleetView({
          mayRequest: true,
          choices: [armadaRef()],
          lastAnswered: armadaRequest({
            status: ArmadaRequestStatus.REJECTED,
            answeredAt: '2026-09-25T10:00:00.000Z',
            reason: 'No room',
          }),
        }),
      );

      expect(pageText(fixture)).toContain(
        'The last request, to join Sol Armada, was rejected on Sep 25, 2026.',
      );
      expect(pageText(fixture)).toContain('Reason: No room');
    });

    it('dates a lapsed request by when it lapsed', () => {
      render(
        fleetView({
          mayRequest: true,
          lastAnswered: armadaRequest({ status: ArmadaRequestStatus.LAPSED }),
        }),
      );

      expect(pageText(fixture)).toContain('was lapsed on Oct 11, 2026.');
      expect(pageText(fixture)).not.toContain('Reason:');
    });
  });

  describe('leaving', () => {
    const PLACED = fleetView({ mayRequest: true, placement: placement() });

    it('tells a Beta with Gammas it cannot leave yet', () => {
      render(
        fleetView({
          mayRequest: true,
          placement: placement({ gammaCount: 2 }),
        }),
      );

      expect(pageText(fixture)).toContain('Before it can leave');
      expect(findButton(fixture, 'Leave the Armada…')).toBeUndefined();
    });

    it('needs a reason, asks first, then leaves and says so', () => {
      render(PLACED);
      pressButton(fixture, 'Leave the Armada…');

      expect(
        (find('button[type="submit"]') as HTMLButtonElement).disabled,
      ).toBe(true);

      typeInto(fixture, '#fleet-armada-leave-reason', '  Moving on  ');
      submit();

      expect(confirm.lastAsked()?.title).toBe('Leave the Armada');
      expect(confirm.lastAsked()?.message).toContain(
        'Take Ninth Fleet out of Sol Armada?',
      );
      expect(service.leave).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'Moving on',
      );
      expect(pageText(fixture)).toContain('Ninth Fleet has left Sol Armada.');
      expect(fixture.componentInstance.leaving()).toBe(false);
    });

    it('stays when the reader thinks better of it', () => {
      confirm.answer(false);
      render(PLACED);
      pressButton(fixture, 'Leave the Armada…');
      typeInto(fixture, '#fleet-armada-leave-reason', 'Moving on');
      submit();

      expect(service.leave).not.toHaveBeenCalled();
    });

    it('sends nothing without a reason', () => {
      render(PLACED);
      pressButton(fixture, 'Leave the Armada…');
      submit();

      expect(confirm.dialog.open).not.toHaveBeenCalled();
    });

    it('closes the form on Stay', () => {
      render(PLACED);
      pressButton(fixture, 'Leave the Armada…');
      pressButton(fixture, 'Stay');

      expect(find('form')).toBeNull();
      expect(findButton(fixture, 'Leave the Armada…')).not.toBeUndefined();
    });
  });
});
