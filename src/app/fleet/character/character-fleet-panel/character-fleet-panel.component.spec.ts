import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { CharacterFleetService } from 'src/app/fleet/character-fleet.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import {
  CharacterFleetMembership,
  CharacterFleetMembershipSource,
  CharacterFleetProposal,
  CharacterFleetProposalState,
  FleetAudience,
  FleetDirectoryPage,
  FleetRecruitmentState,
  FleetScopeStatus,
  StoFleetCard,
} from 'src/app/models/fleet.models';

import { CharacterFleetPanelComponent } from './character-fleet-panel.component';

/**
 * Builds the Fleet a record names.
 *
 * @param overrides - Fields to override.
 * @returns The Fleet summary.
 */
function summary(
  overrides: Partial<CharacterFleetMembership['fleet']> = {},
): CharacterFleetMembership['fleet'] {
  return {
    id: 'fleet-1',
    exactGameName: 'Starfleet Command',
    slug: 'starfleet-command',
    platformName: 'Windows',
    platformSegment: 'windows',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    ...overrides,
  };
}

/**
 * Builds a history entry.
 *
 * @param overrides - Fields to override.
 * @returns The membership.
 */
function membership(
  overrides: Partial<CharacterFleetMembership> = {},
): CharacterFleetMembership {
  return {
    id: 'membership-1',
    characterId: 'character-1',
    fleet: summary(),
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: null,
    source: CharacterFleetMembershipSource.MANUAL,
    visibility: FleetAudience.PRIVATE,
    proposalId: null,
    recordedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a proposal.
 *
 * @param overrides - Fields to override.
 * @returns The proposal.
 */
function proposal(
  overrides: Partial<CharacterFleetProposal> = {},
): CharacterFleetProposal {
  return {
    id: 'proposal-1',
    characterId: 'character-1',
    fleet: summary({ id: 'fleet-2', exactGameName: 'Sol Defence Force' }),
    state: CharacterFleetProposalState.PENDING,
    observedAt: null,
    raisedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-04-01T00:00:00.000Z',
    answeredAt: null,
    ...overrides,
  };
}

/**
 * Builds a directory card, as the picker's search returns one.
 *
 * @returns The card.
 */
function card(): StoFleetCard {
  return {
    id: 'fleet-1',
    name: 'Starfleet Command',
    slug: 'starfleet-command',
    exactGameName: 'Starfleet Command',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    platformId: 'platform-1',
    platformName: 'Windows',
    platformSegment: 'windows',
    duplicateCount: 0,
    recruitmentState: FleetRecruitmentState.OPEN,
    allegianceFactionId: null,
    lastEffectiveImportAt: null,
    status: FleetScopeStatus.ACTIVE,
    bannerImageId: null,
    bannerImageAlt: null,
    emblemImageId: null,
    emblemImageAlt: null,
  } as StoFleetCard;
}

/**
 * A page of one card.
 *
 * @param items - The cards on it.
 * @returns The page.
 */
function page(items: StoFleetCard[]): FleetDirectoryPage<StoFleetCard> {
  return { items, total: items.length, page: 1, pageSize: 8 };
}

describe('CharacterFleetPanelComponent', () => {
  let fixture: ComponentFixture<CharacterFleetPanelComponent>;
  let component: CharacterFleetPanelComponent;
  let service: {
    history: jest.Mock;
    record: jest.Mock;
    leave: jest.Mock;
    retract: jest.Mock;
    setVisibility: jest.Mock;
    proposals: jest.Mock;
    accept: jest.Mock;
    decline: jest.Mock;
  };
  let directory: { listFleets: jest.Mock };

  /** Anything on the panel, by class. */
  const text = (): string => fixture.nativeElement.textContent as string;

  /**
   * Builds and renders the panel with whatever the mocks are set to.
   */
  const render = (): void => {
    fixture = TestBed.createComponent(CharacterFleetPanelComponent);
    component = fixture.componentInstance;
    component.characterId = 'character-1';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    service = {
      history: jest.fn(() => of([] as CharacterFleetMembership[])),
      record: jest.fn(() => of(membership())),
      leave: jest.fn(() => of(membership({ validTo: '2026-06-01Z' }))),
      // A 204 reaches HttpClient's caller as a null body.
      retract: jest.fn(() => of(null)),
      setVisibility: jest.fn(() => of(membership())),
      proposals: jest.fn(() => of([] as CharacterFleetProposal[])),
      accept: jest.fn(() => of(membership())),
      decline: jest.fn(() =>
        of(proposal({ state: CharacterFleetProposalState.DECLINED })),
      ),
    };
    directory = { listFleets: jest.fn(() => of(page([card()]))) };

    await TestBed.configureTestingModule({
      imports: [CharacterFleetPanelComponent],
      providers: [
        provideRouter([]),
        { provide: CharacterFleetService, useValue: service },
        { provide: FleetDirectoryService, useValue: directory },
      ],
    }).compileComponents();
  });

  it('is defined', () => {
    render();

    expect(component).toBeDefined();
  });

  describe('when nothing is recorded', () => {
    /**
     * The absence is said out loud, along with the fact that recording one
     * publishes nothing. A blank space would leave somebody guessing at both.
     */
    it('says so, and that nothing here is published by default', () => {
      render();

      expect(text()).toContain('No Fleet is recorded for this Captain');
      expect(text()).toContain('unless you say so');
    });
  });

  describe('when the history cannot be read', () => {
    it('says so rather than showing an empty record', () => {
      service.history.mockReturnValue(throwError(() => new Error('nope')));

      render();

      expect(text()).toContain('could not be read');
      expect(service.proposals).not.toHaveBeenCalled();
    });
  });

  describe('the current Fleet', () => {
    it('names it, when it began, and where it came from', () => {
      service.history.mockReturnValue(
        of([
          membership({
            source: CharacterFleetMembershipSource.CONFIRMED_IMPORT,
          }),
        ]),
      );

      render();

      expect(text()).toContain('Starfleet Command');
      expect(text()).toContain('You confirmed this from a Fleet roster');
    });

    /**
     * Leaving keeps the entry. The button says what it does rather than
     * "remove", because the other button next to it is the one that removes.
     */
    it('offers leaving and withdrawing as two different things', () => {
      service.history.mockReturnValue(of([membership()]));

      render();

      expect(text()).toContain('I have left this Fleet');
      expect(text()).toContain('Remove — this was never right');
    });

    it('records a departure without removing anything', () => {
      service.history.mockReturnValue(of([membership()]));
      render();

      component['leave']();

      expect(service.leave).toHaveBeenCalledWith('character-1');
      expect(service.retract).not.toHaveBeenCalled();
    });

    it('withdraws one recorded in error', () => {
      const entry = membership();

      service.history.mockReturnValue(of([entry]));
      render();

      component['withdraw'](entry);

      expect(service.retract).toHaveBeenCalledWith(
        'character-1',
        'membership-1',
      );
    });

    // The server answers a withdrawal with 204 and no body. Success is the
    // request completing, not what it carried back.
    it('treats a withdrawal answered with no body as done', () => {
      const entry = membership();

      service.history.mockReturnValue(of([entry]));
      render();
      service.history.mockClear();

      component['withdraw'](entry);
      fixture.detectChanges();

      expect(text()).not.toContain('could not be withdrawn');
      expect(service.history).toHaveBeenCalledTimes(1);
    });

    // Showing "Anyone" against an entry only its owner sees would tell them
    // it is public when it is not.
    it.each([FleetAudience.PRIVATE, FleetAudience.FLEET_MEMBERS])(
      'shows an entry seen by %s as exactly that',
      visibility => {
        service.history.mockReturnValue(of([membership({ visibility })]));

        render();

        const select = (
          fixture.nativeElement as HTMLElement
        ).querySelector<HTMLSelectElement>('#visibility-membership-1');

        expect(select?.value).toBe(visibility);
      },
    );

    it('changes who may see one entry at a time', () => {
      const entry = membership();

      service.history.mockReturnValue(of([entry]));
      render();

      component['changeVisibility'](entry, FleetAudience.FLEET_MEMBERS);

      expect(service.setVisibility).toHaveBeenCalledWith(
        'character-1',
        'membership-1',
        FleetAudience.FLEET_MEMBERS,
      );
    });

    it('says what went wrong when a write fails', () => {
      service.history.mockReturnValue(of([membership()]));
      service.leave.mockReturnValue(throwError(() => new Error('nope')));
      render();

      component['leave']();
      fixture.detectChanges();

      expect(text()).toContain('That departure could not be recorded');
    });
  });

  describe('the past', () => {
    it('lists what has ended, with its dates and its audience', () => {
      service.history.mockReturnValue(
        of([
          membership({
            id: 'past-1',
            validTo: '2026-05-01T00:00:00.000Z',
            visibility: FleetAudience.PUBLIC,
          }),
        ]),
      );

      render();

      expect(text()).toContain('Previously');
      expect(text()).toContain('Anyone, including signed-out visitors');
    });
  });

  describe('proposals', () => {
    /**
     * They come first because they are the only thing on the panel that
     * somebody else is waiting on an answer to.
     */
    it('puts an unanswered one in front of the record', () => {
      service.proposals.mockReturnValue(of([proposal()]));

      render();

      expect(text()).toContain('Awaiting your answer');
      expect(text()).toContain('Sol Defence Force');
    });

    it('says when the evidence saw the Captain, where it did', () => {
      service.proposals.mockReturnValue(
        of([proposal({ observedAt: '2026-02-01T00:00:00.000Z' })]),
      );

      render();

      expect(text()).toContain('Seen on that roster');
    });

    // The acceptance criteria ask for the Community as well as the moment. A
    // proposal is only raised to somebody who can see the Fleet, so naming
    // its Community tells them nothing they could not already see.
    it('names the Fleet’s Community, linking to it', () => {
      service.proposals.mockReturnValue(of([proposal()]));

      render();

      const link = (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLAnchorElement>('.character-fleet__proposal-name a');

      expect(link?.textContent).toBe('United Federation Alliance');
      expect(link?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance',
      );
    });

    // Angular drops white space that stands alone between two elements, so
    // the space before "in" has to live inside its span.
    it('keeps a space between the platform and the Community', () => {
      service.proposals.mockReturnValue(of([proposal()]));

      render();

      const name = (fixture.nativeElement as HTMLElement).querySelector(
        '.character-fleet__proposal-name',
      );

      expect(name?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Sol Defence Force on Windows in United Federation Alliance',
      );
    });

    it('names no Community where the Fleet has none', () => {
      service.proposals.mockReturnValue(
        of([
          proposal({
            fleet: summary({ communityName: null, communitySlug: null }),
          }),
        ]),
      );

      render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.character-fleet__proposal-name a',
        ),
      ).toBeNull();
    });

    it('accepts one privately, whatever else is on the panel', () => {
      const pending = proposal();

      service.proposals.mockReturnValue(of([pending]));
      render();

      component['accept'](pending);

      expect(service.accept).toHaveBeenCalledWith(
        'character-1',
        'proposal-1',
        FleetAudience.PRIVATE,
      );
    });

    /**
     * Answering one leaves the rest where they are. A Character may genuinely
     * have been in both Fleets at different times.
     */
    it('answers only the one it was asked about', () => {
      const first = proposal();
      const second = proposal({ id: 'proposal-2' });

      service.proposals.mockReturnValue(of([first, second]));
      render();

      component['decline'](first);

      expect(service.decline).toHaveBeenCalledTimes(1);
      expect(service.decline).toHaveBeenCalledWith('character-1', 'proposal-1');
    });

    it('leaves an answered one off the list', () => {
      service.proposals.mockReturnValue(
        of([proposal({ state: CharacterFleetProposalState.DECLINED })]),
      );

      render();

      expect(text()).not.toContain('Awaiting your answer');
    });

    it('offers the deadline while there is one', () => {
      render();

      expect(component['deadline'](proposal())).toMatch(/^Answer by /);
    });

    it('says a lapsed one has expired rather than asking for an answer', () => {
      render();

      expect(
        component['deadline'](
          proposal({ state: CharacterFleetProposalState.EXPIRED }),
        ),
      ).toMatch(/^Expired /);
    });

    it('carries on when the proposals cannot be read', () => {
      service.history.mockReturnValue(of([membership()]));
      service.proposals.mockReturnValue(throwError(() => new Error('nope')));

      render();

      expect(text()).toContain('Starfleet Command');
      expect(text()).not.toContain('Awaiting your answer');
    });
  });

  describe('recording one', () => {
    it('opens and closes the form', () => {
      render();

      component['toggleRecording']();
      fixture.detectChanges();

      expect(text()).toContain('Find the Fleet');

      component['toggleRecording']();
      fixture.detectChanges();

      expect(text()).not.toContain('Find the Fleet');
    });

    it('asks the directory for the Fleet by name', () => {
      render();
      component['toggleRecording']();
      component['form'].controls.search.setValue('starfleet');

      component['search']();

      expect(directory.listFleets).toHaveBeenCalledWith({
        search: 'starfleet',
        pageSize: 8,
      });
    });

    it('does not search on an empty box', () => {
      render();
      component['toggleRecording']();

      component['search']();

      expect(directory.listFleets).not.toHaveBeenCalled();
    });

    /**
     * Only records that exist here can be picked, so an empty result says
     * where a record is made rather than leaving somebody to guess.
     */
    it('says where to make a record when the search finds nothing', () => {
      directory.listFleets.mockReturnValue(of(page([])));
      render();
      component['toggleRecording']();
      component['form'].controls.search.setValue('nothing');

      component['search']();
      fixture.detectChanges();

      expect(text()).toContain('has to have a record on this site');
    });

    it('treats a failed search as finding nothing', () => {
      directory.listFleets.mockReturnValue(throwError(() => new Error('nope')));
      render();
      component['toggleRecording']();
      component['form'].controls.search.setValue('starfleet');

      component['search']();
      fixture.detectChanges();

      expect(text()).toContain('has to have a record on this site');
    });

    it('records the Fleet that was picked, from the date given', () => {
      render();
      component['toggleRecording']();
      component['pick'](card());
      component['form'].controls.validFrom.setValue('2026-03-04');

      component['submit']();

      expect(service.record).toHaveBeenCalledWith('character-1', {
        fleetId: 'fleet-1',
        validFrom: new Date('2026-03-04').toISOString(),
        visibility: FleetAudience.PRIVATE,
      });
    });

    it('refuses to record without a date, and says which field', () => {
      render();
      component['toggleRecording']();
      component['pick'](card());

      component['submit']();
      fixture.detectChanges();

      expect(service.record).not.toHaveBeenCalled();
      expect(text()).toContain('Please say when this Captain joined');
    });

    it('refuses to record without a Fleet', () => {
      render();
      component['toggleRecording']();
      component['form'].controls.validFrom.setValue('2026-03-04');

      component['submit']();

      expect(service.record).not.toHaveBeenCalled();
    });

    it('closes the form once the record is written', () => {
      render();
      component['toggleRecording']();
      component['pick'](card());
      component['form'].controls.validFrom.setValue('2026-03-04');

      component['submit']();
      fixture.detectChanges();

      expect(text()).not.toContain('Find the Fleet');
    });
  });

  describe('dates', () => {
    /**
     * A malformed instant is a bad row, not a reason for the panel around it
     * to go blank: the raw value is shown and the rest of the entry still
     * reads.
     */
    it('shows an unformattable instant as it arrived', () => {
      render();

      expect(component['instant']('not an instant')).toBe('not an instant');
    });
  });

  describe('reading back', () => {
    /**
     * A record closes another one and an acceptance answers a proposal, so the
     * panel asks rather than patching what it holds and eventually guessing
     * wrong.
     */
    it('reads both lists again after a write', () => {
      service.history.mockReturnValue(of([membership()]));
      render();
      service.history.mockClear();
      service.proposals.mockClear();

      component['leave']();

      expect(service.history).toHaveBeenCalledTimes(1);
      expect(service.proposals).toHaveBeenCalledTimes(1);
    });
  });
});
