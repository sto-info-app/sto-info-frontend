import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import {
  armadaBeta,
  armadaFleet,
  armadaNode,
  armadaStructure,
  armadaView,
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
import { ArmadaPosition, ArmadaView } from 'src/app/models/fleet-armada.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  ARMADA_CHANGE_FAILED,
  ARMADA_VIEW_FAILED,
  ArmadaPanelComponent,
  ArmadaPanelVm,
} from './armada-panel.component';

const NINTH = armadaFleet('Ninth Fleet');
const TENTH = armadaFleet('Tenth Fleet');
const ELEVENTH = armadaFleet('Eleventh Fleet');
const TWELFTH = armadaFleet('Twelfth Fleet');

/** The Armada the panel is on. */
const VM: ArmadaPanelVm = {
  communityId: 'community-1',
  armadaId: 'armada-1',
  armadaName: 'Sol Armada',
  communitySlug: 'united-federation-alliance',
  communityName: 'United Federation Alliance',
  requestsLink: ['/requests'],
};

/**
 * An Armada a manager reads: the Ninth leads, the Tenth has the Eleventh
 * under it, and the Twelfth and a hidden Fleet are Betas alone.
 */
const MANAGED = armadaView({
  mayManage: true,
  structure: armadaStructure({
    alpha: armadaNode(NINTH, ArmadaPosition.ALPHA),
    betas: [
      armadaBeta(TENTH, [ELEVENTH]),
      armadaBeta(TWELFTH),
      armadaBeta(HIDDEN_ARMADA_FLEET),
    ],
  }),
});

describe('ArmadaPanelComponent', () => {
  let fixture: ComponentFixture<ArmadaPanelComponent>;
  let service: { view: jest.Mock; move: jest.Mock; remove: jest.Mock };
  let confirm: ConfirmPromptDouble;

  /**
   * Draws the panel.
   *
   * @param view - The shape the server answers, or leave it pending.
   */
  function render(view: ArmadaView | null = MANAGED): void {
    service.view.mockReturnValue(view === null ? NEVER : of(view));
    TestBed.configureTestingModule({
      imports: [ArmadaPanelComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: FleetArmadaService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(ArmadaPanelComponent);
    fixture.componentRef.setInput('vm', VM);
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

  /**
   * Presses a Fleet's Move… or Remove….
   *
   * @param action - Which.
   * @param fleet - Whose, by name.
   */
  function press(action: 'Move' | 'Remove', fleet: string): void {
    (find(`[aria-label="${action} ${fleet}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  /** Submits the open form. */
  function submit(): void {
    (find('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * The submit button's state.
   *
   * @returns Whether it is disabled.
   */
  function submitDisabled(): boolean {
    return (find('button[type="submit"]') as HTMLButtonElement).disabled;
  }

  beforeEach(() => {
    service = {
      view: jest.fn(),
      move: jest.fn(() => of(armadaView())),
      remove: jest.fn(() => of(armadaView())),
    };
    confirm = stubConfirmPrompt();
  });

  describe('reading', () => {
    it('says it is reading until the shape arrives', () => {
      render(null);

      expect(service.view).toHaveBeenCalledWith('community-1', 'armada-1');
      expect(pageText(fixture)).toContain('Reading the Fleets…');
    });

    it('says when the shape could not be read', () => {
      service.view.mockReturnValue(throwError(() => new Error('down')));
      TestBed.configureTestingModule({
        imports: [ArmadaPanelComponent],
        providers: [
          provideRouter([]),
          confirm.provider,
          { provide: FleetArmadaService, useValue: service },
        ],
      });
      fixture = TestBed.createComponent(ArmadaPanelComponent);
      fixture.componentRef.setInput('vm', VM);
      fixture.detectChanges();

      expect(pageText(fixture)).toContain(ARMADA_VIEW_FAILED);
    });

    it('shows a reader the tree and nothing to change', () => {
      render(armadaView({ structure: MANAGED.structure, openRequests: 2 }));

      expect(pageText(fixture)).toContain('Ninth Fleet');
      expect(findButton(fixture, 'Move…')).toBeUndefined();
      expect(find('.armada-panel__requests')).toBeNull();
    });

    it('points a manager at the requests waiting', () => {
      render({ ...MANAGED, openRequests: 2 });

      expect(find('.armada-panel__requests')?.textContent).toContain(
        '2 requests to join',
      );
    });

    it('counts a single request as one', () => {
      render({ ...MANAGED, openRequests: 1 });

      expect(find('.armada-panel__requests a')?.textContent).toContain(
        '1 request to join',
      );
    });
  });

  describe('moving a Fleet', () => {
    it('suggests Beta for the Alpha and Alpha for anybody else', () => {
      render();

      press('Move', 'Ninth Fleet');
      expect(fixture.componentInstance.position()).toBe(ArmadaPosition.BETA);

      pressButton(fixture, 'Cancel');
      press('Move', 'Twelfth Fleet');
      expect(fixture.componentInstance.position()).toBe(ArmadaPosition.ALPHA);
      expect(pageText(fixture)).toContain('Move Twelfth Fleet, now Beta.');
    });

    it('hides every Fleet’s buttons while a form is open', () => {
      render();

      press('Move', 'Twelfth Fleet');

      expect(find('[aria-label="Move Ninth Fleet"]')).toBeNull();
    });

    it('needs a reason, then moves it and says so', () => {
      render();
      press('Move', 'Twelfth Fleet');

      expect(submitDisabled()).toBe(true);

      typeInto(fixture, '#armada-change-reason', '  Leading now  ');
      submit();

      expect(service.move).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TWELFTH.id,
        { position: ArmadaPosition.ALPHA, reason: 'Leading now' },
      );
      expect(find('form')).toBeNull();
      expect(find('[role="status"]')?.textContent).toContain(
        'Twelfth Fleet moved.',
      );
      expect(confirm.dialog.open).not.toHaveBeenCalled();
    });

    it('needs a Beta to sit a Gamma under, from the others', () => {
      render();
      press('Move', 'Twelfth Fleet');
      chooseFrom(fixture, '#armada-move-position', ArmadaPosition.GAMMA);
      typeInto(fixture, '#armada-change-reason', 'Supporting');

      const options = Array.from(
        (find('#armada-move-parent') as HTMLSelectElement).options,
      ).map(option => option.textContent?.trim());

      expect(options).toEqual(['Choose a Beta', 'Tenth Fleet']);
      expect(submitDisabled()).toBe(true);

      chooseFrom(fixture, '#armada-move-parent', TENTH.id as string);
      submit();

      expect(service.move).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TWELFTH.id,
        {
          position: ArmadaPosition.GAMMA,
          parentFleetId: TENTH.id,
          reason: 'Supporting',
        },
      );
    });

    it('asks nothing about a Beta’s Gammas while it stays a Beta', () => {
      render();
      press('Move', 'Tenth Fleet');
      chooseFrom(fixture, '#armada-move-position', ArmadaPosition.BETA);

      expect(find('fieldset')).toBeNull();
    });

    it('asks what becomes of each Gamma when a Beta stops being one', () => {
      render();
      press('Move', 'Tenth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Leading now');

      expect(find('legend')?.textContent).toContain(
        'What becomes of the Gammas under Tenth Fleet',
      );
      expect(submitDisabled()).toBe(true);

      const outcome = `#gamma-outcome-${ELEVENTH.id}`;

      chooseFrom(fixture, outcome, 'GAMMA');
      expect(submitDisabled()).toBe(true);

      chooseFrom(fixture, `#gamma-parent-${ELEVENTH.id}`, TWELFTH.id as string);
      expect(submitDisabled()).toBe(false);

      submit();

      expect(service.move).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TENTH.id,
        {
          position: ArmadaPosition.ALPHA,
          reason: 'Leading now',
          gammas: [
            {
              fleetId: ELEVENTH.id,
              outcome: 'GAMMA',
              parentFleetId: TWELFTH.id,
            },
          ],
        },
      );
    });

    it('sends a Gamma promoted or taken out without a parent', () => {
      render();
      press('Move', 'Tenth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Leading now');
      chooseFrom(fixture, `#gamma-outcome-${ELEVENTH.id}`, 'LEAVE');
      expect(submitDisabled()).toBe(false);
      chooseFrom(fixture, `#gamma-outcome-${ELEVENTH.id}`, '');
      expect(submitDisabled()).toBe(true);
      chooseFrom(fixture, `#gamma-outcome-${ELEVENTH.id}`, 'BETA');
      submit();

      expect(service.move).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TENTH.id,
        expect.objectContaining({
          gammas: [{ fleetId: ELEVENTH.id, outcome: 'BETA' }],
        }),
      );
    });

    it('shows the server’s refusal and keeps the form', () => {
      service.move.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'An Armada has at most 3 Betas.' },
            }),
        ),
      );
      render();
      press('Move', 'Ninth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Stepping back');
      submit();

      expect(pageText(fixture)).toContain('An Armada has at most 3 Betas.');
      expect(find('form')).not.toBeNull();
      expect(fixture.componentInstance.busy()).toBe(false);
    });

    it('says a failure it cannot explain plainly', () => {
      service.move.mockReturnValue(throwError(() => new Error('down')));
      render();
      press('Move', 'Ninth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Stepping back');
      submit();

      expect(pageText(fixture)).toContain(ARMADA_CHANGE_FAILED);
    });

    it('sends nothing from a form that is not ready, or not open', () => {
      render();

      fixture.componentInstance.onSubmit();
      press('Move', 'Ninth Fleet');
      submit();

      expect(service.move).not.toHaveBeenCalled();
    });

    it('closes the form when it is handed another Armada', () => {
      render();
      press('Move', 'Ninth Fleet');
      fixture.componentRef.setInput('vm', { ...VM, armadaId: 'armada-2' });
      fixture.detectChanges();

      expect(service.view).toHaveBeenLastCalledWith('community-1', 'armada-2');
      expect(fixture.componentInstance.editing()).toBeNull();
      expect(find('form')).toBeNull();
    });

    it('closes the form without keeping anything', () => {
      render();
      press('Move', 'Ninth Fleet');
      pressButton(fixture, 'Cancel');

      expect(find('form')).toBeNull();
      expect(fixture.componentInstance.error()).toBeNull();
      expect(fixture.componentInstance.gammasOfEdited()).toEqual([]);
      expect(fixture.componentInstance.needsGammas()).toBe(false);
    });
  });

  describe('taking a Fleet out', () => {
    it('asks first, then takes it out and says so', () => {
      render();
      press('Remove', 'Twelfth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Inactive');
      submit();

      expect(confirm.lastAsked()?.title).toBe('Remove a Fleet');
      expect(confirm.lastAsked()?.message).toContain(
        'Take Twelfth Fleet out of Sol Armada?',
      );
      expect(service.remove).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TWELFTH.id,
        { reason: 'Inactive' },
      );
      expect(pageText(fixture)).toContain(
        'Twelfth Fleet was taken out of the Armada.',
      );
    });

    it('takes nothing out when the reader thinks better of it', () => {
      confirm.answer(false);
      render();
      press('Remove', 'Twelfth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Inactive');
      submit();

      expect(service.remove).not.toHaveBeenCalled();
      expect(find('form')).not.toBeNull();
    });

    it('says what becomes of a Beta’s Gammas', () => {
      render();
      press('Remove', 'Tenth Fleet');
      typeInto(fixture, '#armada-change-reason', 'Inactive');

      expect(find('#armada-move-position')).toBeNull();

      chooseFrom(fixture, `#gamma-outcome-${ELEVENTH.id}`, 'LEAVE');
      submit();

      expect(service.remove).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        TENTH.id,
        {
          reason: 'Inactive',
          gammas: [{ fleetId: ELEVENTH.id, outcome: 'LEAVE' }],
        },
      );
    });
  });
});
