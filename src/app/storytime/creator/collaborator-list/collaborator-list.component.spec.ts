import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CollaborationInvitationStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import { CrewService } from '../../crew.service';
import { CollaboratorListComponent } from './collaborator-list.component';

describe('CollaboratorListComponent', () => {
  let fixture: ComponentFixture<CollaboratorListComponent>;
  let crewService: {
    getCollaborators: jest.Mock;
    invite: jest.Mock;
    updateCollaborator: jest.Mock;
    revoke: jest.Mock;
  };

  /**
   * Builds a collaboration.
   *
   * @param overrides - Fields to change.
   * @returns The collaboration.
   */
  const buildCollaborator = (
    overrides: Partial<Collaborator> = {},
  ): Collaborator =>
    ({
      id: 'collaborator-1',
      storyId: 'story-1',
      userId: 'member-1',
      collaborationRole: 'Co-writer',
      canEditStory: false,
      canManageChapters: true,
      canManageCharacters: false,
      canManageCrew: false,
      canManageCollaborators: false,
      invitationStatus: CollaborationInvitationStatus.ACCEPTED,
      invitedByUserId: 'owner-1',
      invitedAt: '2026-05-01T10:00:00.000Z',
      acceptedAt: '2026-05-02T10:00:00.000Z',
      ...overrides,
    }) as Collaborator;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(CollaboratorListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    crewService = {
      getCollaborators: jest.fn().mockReturnValue(of([buildCollaborator()])),
      invite: jest.fn().mockReturnValue(of(buildCollaborator())),
      updateCollaborator: jest.fn().mockReturnValue(of(buildCollaborator())),
      revoke: jest.fn().mockReturnValue(of(buildCollaborator())),
    };

    TestBed.configureTestingModule({
      imports: [CollaboratorListComponent],
      providers: [
        provideRouter([]),
        { provide: CrewService, useValue: crewService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['storyId', 'story-1']]) },
          },
        },
      ],
    });
  });

  it('lists who is helping write the Story', () => {
    const element = render();

    expect(element.textContent).toContain('Co-writer');
    expect(element.textContent).toContain('Collaborating');
    expect(crewService.getCollaborators).toHaveBeenCalledWith('story-1');
  });

  it('explains a Story nobody else is working on', () => {
    crewService.getCollaborators.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('Nobody else is working on this');
  });

  // Collaboration and crediting are different things, and conflating them is
  // exactly the mistake worth heading off on the page that does the first one.
  it('says plainly that crediting is separate', () => {
    const element = render();

    expect(element.textContent).toContain('gives them no access');
  });

  // Only the owner may publish, so offering a switch that could never be
  // turned on would be worse than saying nothing.
  it('offers no publishing control anywhere', () => {
    const element = render();

    expect(element.textContent).not.toContain('Publish');
  });

  describe('inviting', () => {
    it('refuses to send an invitation with nobody named', () => {
      render();

      fixture.componentInstance.invite();

      expect(crewService.invite).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.controls.userId.touched).toBe(true);
    });

    it('sends the capabilities that were ticked', () => {
      render();
      fixture.componentInstance.form.patchValue({
        userId: 'member-2',
        canManageChapters: true,
      });

      fixture.componentInstance.invite();

      expect(crewService.invite).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({
          userId: 'member-2',
          canManageChapters: true,
          canEditStory: false,
        }),
      );
    });

    // A role nobody typed is nothing, not an empty string.
    it('omits a role that was left blank', () => {
      render();
      fixture.componentInstance.form.patchValue({ userId: 'member-2' });

      fixture.componentInstance.invite();

      expect(
        crewService.invite.mock.calls[0][1].collaborationRole,
      ).toBeUndefined();
    });

    it('clears the form afterwards', () => {
      render();
      fixture.componentInstance.form.patchValue({ userId: 'member-2' });

      fixture.componentInstance.invite();

      expect(fixture.componentInstance.form.controls.userId.value).toBe('');
    });

    // The server explains why — already invited, or the owner — and repeating
    // that verbatim beats a generic apology.
    it('shows the reason the server gave', () => {
      crewService.invite.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'That member has already been invited.' },
            }),
        ),
      );
      render();
      fixture.componentInstance.form.patchValue({ userId: 'member-2' });

      fixture.componentInstance.invite();

      expect(fixture.componentInstance.errorMessage).toBe(
        'That member has already been invited.',
      );
    });

    it('falls back to a plain message when the server gave no reason', () => {
      crewService.invite.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();
      fixture.componentInstance.form.patchValue({ userId: 'member-2' });

      fixture.componentInstance.invite();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });
  });

  describe('an invitation nobody has answered', () => {
    beforeEach(() => {
      crewService.getCollaborators.mockReturnValue(
        of([
          buildCollaborator({
            invitationStatus: CollaborationInvitationStatus.INVITED,
          }),
        ]),
      );
    });

    it('says it grants nothing yet', () => {
      const element = render();

      expect(element.textContent).toContain('have not answered yet');
    });

    it('offers to withdraw it rather than remove them', () => {
      const element = render();

      expect(element.textContent).toContain('Withdraw invitation');
    });
  });

  it('offers to remove an accepted collaborator', () => {
    const element = render();

    expect(element.textContent).toContain('Remove');
  });

  describe('changing what somebody may do', () => {
    it('grants a capability', () => {
      render();

      fixture.componentInstance.setCapability(
        buildCollaborator(),
        'canManageCrew',
        true,
      );

      expect(crewService.updateCollaborator).toHaveBeenCalledWith(
        'collaborator-1',
        { canManageCrew: true },
      );
    });

    it('takes one away', () => {
      render();

      fixture.componentInstance.setCapability(
        buildCollaborator(),
        'canManageChapters',
        false,
      );

      expect(crewService.updateCollaborator).toHaveBeenCalledWith(
        'collaborator-1',
        { canManageChapters: false },
      );
    });

    it('reloads so the list reflects what the server did', () => {
      render();

      fixture.componentInstance.setCapability(
        buildCollaborator(),
        'canEditStory',
        true,
      );

      expect(crewService.getCollaborators).toHaveBeenCalledTimes(2);
    });
  });

  it('revokes a collaboration', () => {
    render();

    fixture.componentInstance.revoke(buildCollaborator());

    expect(crewService.revoke).toHaveBeenCalledWith('collaborator-1');
  });

  describe('when the list cannot be loaded', () => {
    it('says plainly when the Story is not theirs to see', () => {
      crewService.getCollaborators.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );

      const element = render();

      expect(element.textContent).toContain('do not have access');
    });

    it('reports another failure differently', () => {
      crewService.getCollaborators.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('could not be loaded');
      expect(fixture.componentInstance.isLoading).toBe(false);
    });
  });

  it('asks for an empty Story when the route carries none', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { paramMap: new Map() } },
    });

    render();

    expect(crewService.getCollaborators).toHaveBeenCalledWith('');
  });
});
