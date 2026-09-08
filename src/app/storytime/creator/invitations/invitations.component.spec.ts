import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ArcCollaborator,
  ArcMembership,
  ArcMembershipStatus,
  CollaborationInvitationStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { CrewService } from '../../crew.service';
import { InvitationsComponent } from './invitations.component';

describe('InvitationsComponent', () => {
  let fixture: ComponentFixture<InvitationsComponent>;
  let crewService: {
    getMyInvitations: jest.Mock;
    accept: jest.Mock;
    decline: jest.Mock;
  };
  let arcService: {
    getMyArcInvitations: jest.Mock;
    getPendingMemberships: jest.Mock;
    acceptArcCollaboration: jest.Mock;
    declineArcCollaboration: jest.Mock;
    approveMembership: jest.Mock;
    declineMembership: jest.Mock;
  };

  /**
   * Builds a Story collaboration invitation.
   *
   * @param overrides - Fields to change.
   * @returns The invitation.
   */
  const buildInvitation = (
    overrides: Partial<Collaborator> = {},
  ): Collaborator =>
    ({
      id: 'collaborator-1',
      storyId: 'story-1',
      userId: 'user-1',
      collaborationRole: null,
      canEditStory: false,
      canManageChapters: false,
      canManageCharacters: false,
      canManageCrew: false,
      canManageCollaborators: false,
      invitationStatus: CollaborationInvitationStatus.INVITED,
      invitedByUserId: 'owner-1',
      invitedAt: '2026-05-01T10:00:00.000Z',
      acceptedAt: null,
      ...overrides,
    }) as Collaborator;

  /**
   * Builds an Arc collaboration invitation.
   *
   * @param overrides - Fields to change.
   * @returns The invitation.
   */
  const buildArcInvitation = (
    overrides: Partial<ArcCollaborator> = {},
  ): ArcCollaborator =>
    ({
      id: 'arc-collaborator-1',
      arcId: 'arc-1',
      userId: 'user-1',
      collaborationRole: null,
      canEditArc: false,
      canManageStories: false,
      canManageCollaborators: false,
      invitationStatus: CollaborationInvitationStatus.INVITED,
      invitedByUserId: 'curator-1',
      invitedAt: '2026-05-01T10:00:00.000Z',
      acceptedAt: null,
      ...overrides,
    }) as ArcCollaborator;

  /**
   * Builds an Arc membership waiting on somebody.
   *
   * @param overrides - Fields to change.
   * @returns The membership.
   */
  const buildMembership = (
    overrides: Partial<ArcMembership> = {},
  ): ArcMembership =>
    ({
      id: 'membership-1',
      arcId: 'arc-1',
      storyId: 'story-1',
      orderIndex: 1000,
      membershipStatus: ArcMembershipStatus.INVITED,
      introductoryNote: null,
      story: { id: 'story-1', title: 'First Contact' },
      ...overrides,
    }) as ArcMembership;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(InvitationsComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    crewService = {
      getMyInvitations: jest.fn().mockReturnValue(of([buildInvitation()])),
      accept: jest.fn().mockReturnValue(of(buildInvitation())),
      decline: jest.fn().mockReturnValue(of(buildInvitation())),
    };
    arcService = {
      getMyArcInvitations: jest.fn().mockReturnValue(of([])),
      getPendingMemberships: jest.fn().mockReturnValue(of([])),
      acceptArcCollaboration: jest.fn().mockReturnValue(of(undefined)),
      declineArcCollaboration: jest.fn().mockReturnValue(of(undefined)),
      approveMembership: jest.fn().mockReturnValue(of([])),
      declineMembership: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [InvitationsComponent],
      providers: [
        provideRouter([]),
        { provide: CrewService, useValue: crewService },
        { provide: ArcService, useValue: arcService },
      ],
    });
  });

  it('lists the invitations waiting', () => {
    const element = render();

    expect(element.textContent).toContain('invited to help write');
  });

  it('explains an empty list', () => {
    crewService.getMyInvitations.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('You have nothing waiting');
  });

  it('names the role when the owner set one', () => {
    crewService.getMyInvitations.mockReturnValue(
      of([buildInvitation({ collaborationRole: 'Co-writer' })]),
    );

    const element = render();

    expect(element.textContent).toContain('Co-writer');
  });

  // Agreeing to something without being told what it is would make the
  // acceptance meaningless.
  describe('what an invitation would grant', () => {
    it('lists the capabilities in plain words', () => {
      crewService.getMyInvitations.mockReturnValue(
        of([
          buildInvitation({
            canManageChapters: true,
            canManageCharacters: true,
          }),
        ]),
      );

      const element = render();

      expect(element.textContent).toContain('Write and edit Chapters');
      expect(element.textContent).toContain('Manage the cast');
    });

    it('lists nothing that was not granted', () => {
      crewService.getMyInvitations.mockReturnValue(
        of([buildInvitation({ canManageChapters: true })]),
      );

      const element = render();

      expect(element.textContent).not.toContain('Manage the credits');
      expect(element.textContent).not.toContain('Invite other collaborators');
    });

    // An invitation that grants nothing is a reasonable thing to send, and
    // saying so plainly beats an empty list.
    it('says so when an invitation grants nothing', () => {
      const element = render();

      expect(element.textContent).toContain('does not let you change anything');
      expect(fixture.componentInstance.grants(buildInvitation())).toEqual([]);
    });
  });

  it('accepts an invitation and reloads', () => {
    render();

    fixture.componentInstance.accept(buildInvitation());

    expect(crewService.accept).toHaveBeenCalledWith('collaborator-1');
    expect(crewService.getMyInvitations).toHaveBeenCalledTimes(2);
  });

  it('declines an invitation and reloads', () => {
    render();

    fixture.componentInstance.decline(buildInvitation());

    expect(crewService.decline).toHaveBeenCalledWith('collaborator-1');
    expect(crewService.getMyInvitations).toHaveBeenCalledTimes(2);
  });

  it('explains an answer that could not be saved', () => {
    crewService.accept.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    render();

    fixture.componentInstance.accept(buildInvitation());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  it('explains a list that could not be loaded', () => {
    crewService.getMyInvitations.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const element = render();

    expect(element.textContent).toContain('could not be loaded');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  // Three places to check would mean each gets checked less often.
  describe('Arc decisions', () => {
    it('lists an invitation to help curate an Arc', () => {
      arcService.getMyArcInvitations.mockReturnValue(
        of([buildArcInvitation({ canManageStories: true })]),
      );

      const element = render();

      expect(element.textContent).toContain('invited to help curate an Arc');
      expect(element.textContent).toContain('Choose which Stories are in it');
    });

    it('says when an Arc invitation grants nothing', () => {
      arcService.getMyArcInvitations.mockReturnValue(
        of([buildArcInvitation()]),
      );

      const element = render();

      expect(element.textContent).toContain('as it is put together');
      expect(fixture.componentInstance.arcGrants(buildArcInvitation())).toEqual(
        [],
      );
    });

    it('accepts an Arc invitation and reloads', () => {
      render();

      fixture.componentInstance.acceptArc(buildArcInvitation());

      expect(arcService.acceptArcCollaboration).toHaveBeenCalledWith(
        'arc-collaborator-1',
      );
      expect(arcService.getMyArcInvitations).toHaveBeenCalledTimes(2);
    });

    it('declines an Arc invitation', () => {
      render();

      fixture.componentInstance.declineArc(buildArcInvitation());

      expect(arcService.declineArcCollaboration).toHaveBeenCalledWith(
        'arc-collaborator-1',
      );
    });

    // Which status a membership holds says which side is still waiting, and
    // the wording has to match or the reader cannot tell what they are agreeing
    // to.
    it('describes an invitation to a writer as their Story being wanted', () => {
      render();

      expect(
        fixture.componentInstance.describeMembership(buildMembership()),
      ).toContain('invited into somebody’s Arc');
    });

    it('describes a request to a curator as a Story asking to join', () => {
      render();

      expect(
        fixture.componentInstance.describeMembership(
          buildMembership({
            membershipStatus: ArcMembershipStatus.REQUESTED,
          }),
        ),
      ).toContain('asked to join one of your Arcs');
    });

    it('falls back to a plain description when the Story cannot be seen', () => {
      render();

      expect(
        fixture.componentInstance.describeMembership(
          buildMembership({ story: null }),
        ),
      ).toContain('A Story');
    });

    it('shows the note the other side sent with it', () => {
      arcService.getPendingMemberships.mockReturnValue(
        of([buildMembership({ introductoryNote: 'Starts the second act.' })]),
      );

      const element = render();

      expect(element.textContent).toContain('Starts the second act');
    });

    it('agrees to a membership and reloads', () => {
      render();

      fixture.componentInstance.approveMembership(buildMembership());

      expect(arcService.approveMembership).toHaveBeenCalledWith('membership-1');
      expect(arcService.getPendingMemberships).toHaveBeenCalledTimes(2);
    });

    it('turns down a membership', () => {
      render();

      fixture.componentInstance.declineMembership(buildMembership());

      expect(arcService.declineMembership).toHaveBeenCalledWith('membership-1');
    });

    // Nothing waiting anywhere is the only case worth an empty message.
    it('counts Arc decisions as something waiting', () => {
      crewService.getMyInvitations.mockReturnValue(of([]));
      arcService.getPendingMemberships.mockReturnValue(of([buildMembership()]));

      const element = render();

      expect(fixture.componentInstance.isEmpty).toBe(false);
      expect(element.textContent).not.toContain('You have nothing waiting');
    });
  });
});
