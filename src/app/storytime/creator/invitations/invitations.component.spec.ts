import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CollaborationInvitationStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import { CrewService } from '../../crew.service';
import { InvitationsComponent } from './invitations.component';

describe('InvitationsComponent', () => {
  let fixture: ComponentFixture<InvitationsComponent>;
  let crewService: {
    getMyInvitations: jest.Mock;
    accept: jest.Mock;
    decline: jest.Mock;
  };

  /**
   * Builds an invitation.
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

    TestBed.configureTestingModule({
      imports: [InvitationsComponent],
      providers: [
        provideRouter([]),
        { provide: CrewService, useValue: crewService },
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

    expect(element.textContent).toContain('no invitations waiting');
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
});
