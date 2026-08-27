import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ArcCollaborator,
  CollaborationInvitationStatus,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { ArcCollaboratorListComponent } from './arc-collaborator-list.component';

describe('ArcCollaboratorListComponent', () => {
  let fixture: ComponentFixture<ArcCollaboratorListComponent>;
  let routeParams: Map<string, string>;
  let arcService: {
    getArcCollaborators: jest.Mock;
    inviteArcCollaborator: jest.Mock;
    updateArcCollaborator: jest.Mock;
    revokeArcCollaboration: jest.Mock;
  };

  /**
   * Builds a collaboration.
   *
   * @param overrides - Fields to change.
   * @returns The collaboration.
   */
  const buildCollaborator = (
    overrides: Partial<ArcCollaborator> = {},
  ): ArcCollaborator =>
    ({
      id: 'collaborator-1',
      arcId: 'arc-1',
      userId: 'member-1',
      collaborationRole: null,
      canEditArc: false,
      canManageStories: false,
      canManageCollaborators: false,
      invitationStatus: CollaborationInvitationStatus.ACCEPTED,
      invitedByUserId: 'curator-1',
      invitedAt: '2026-01-01T00:00:00.000Z',
      acceptedAt: '2026-01-02T00:00:00.000Z',
      ...overrides,
    }) as ArcCollaborator;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcCollaboratorListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    routeParams = new Map([['arcId', 'arc-1']]);
    arcService = {
      getArcCollaborators: jest.fn().mockReturnValue(of([buildCollaborator()])),
      inviteArcCollaborator: jest.fn().mockReturnValue(of(buildCollaborator())),
      updateArcCollaborator: jest.fn().mockReturnValue(of(buildCollaborator())),
      revokeArcCollaboration: jest
        .fn()
        .mockReturnValue(of(buildCollaborator())),
    };

    TestBed.configureTestingModule({
      imports: [ArcCollaboratorListComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  it('lists who is helping', () => {
    const element = render();

    expect(element.textContent).toContain('member-1');
    expect(arcService.getArcCollaborators).toHaveBeenCalledWith('arc-1');
  });

  // The route always carries one, but asking for an empty Arc beats asking
  // for "undefined".
  it('asks for an empty Arc when the route names none', () => {
    routeParams.clear();

    render();

    expect(arcService.getArcCollaborators).toHaveBeenCalledWith('');
  });

  it('says so when nobody is helping yet', () => {
    arcService.getArcCollaborators.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('Nobody else is helping');
  });

  // An invitation nobody has answered grants nothing, and saying so avoids a
  // curator assuming the work is already covered.
  it('marks an unanswered invitation as granting nothing yet', () => {
    arcService.getArcCollaborators.mockReturnValue(
      of([
        buildCollaborator({
          invitationStatus: CollaborationInvitationStatus.INVITED,
        }),
      ]),
    );

    const element = render();

    expect(element.textContent).toContain('have not answered yet');
  });

  it('invites somebody with the capabilities chosen', () => {
    render();
    fixture.componentInstance.form.patchValue({
      userId: ' member-2 ',
      collaborationRole: ' Co-curator ',
      canManageStories: true,
    });
    fixture.componentInstance.invite();

    expect(arcService.inviteArcCollaborator).toHaveBeenCalledWith('arc-1', {
      userId: 'member-2',
      collaborationRole: 'Co-curator',
      canEditArc: false,
      canManageStories: true,
      canManageCollaborators: false,
    });
  });

  // An empty role is no role, not an empty name.
  it('sends no role when none was given', () => {
    render();
    fixture.componentInstance.form.patchValue({ userId: 'member-2' });
    fixture.componentInstance.invite();

    expect(arcService.inviteArcCollaborator).toHaveBeenCalledWith(
      'arc-1',
      expect.objectContaining({ collaborationRole: undefined }),
    );
  });

  it('refuses to invite nobody', () => {
    render();
    fixture.componentInstance.invite();

    expect(arcService.inviteArcCollaborator).not.toHaveBeenCalled();
  });

  it('changes a single capability', () => {
    render();
    fixture.componentInstance.setCapability(
      buildCollaborator(),
      'canEditArc',
      true,
    );

    expect(arcService.updateArcCollaborator).toHaveBeenCalledWith(
      'collaborator-1',
      { canEditArc: true },
    );
  });

  it('removes a collaborator', () => {
    render();
    fixture.componentInstance.revoke(buildCollaborator());

    expect(arcService.revokeArcCollaboration).toHaveBeenCalledWith(
      'collaborator-1',
    );
  });

  it('reloads once a change has been saved', () => {
    render();
    fixture.componentInstance.revoke(buildCollaborator());

    expect(arcService.getArcCollaborators).toHaveBeenCalledTimes(2);
  });

  it('explains a refused change in the server’s words', () => {
    arcService.inviteArcCollaborator.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'They have already been invited.' },
          }),
      ),
    );

    render();
    fixture.componentInstance.form.patchValue({ userId: 'member-2' });
    fixture.componentInstance.invite();

    expect(fixture.componentInstance.errorMessage).toContain(
      'already been invited',
    );
  });

  it('falls back to a generic message when the server gives none', () => {
    arcService.inviteArcCollaborator.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.form.patchValue({ userId: 'member-2' });
    fixture.componentInstance.invite();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
  });

  it('says plainly when the caller has no access to the Arc', () => {
    arcService.getArcCollaborators.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'do not have access',
    );
  });

  it('reports any other failure to load', () => {
    arcService.getArcCollaborators.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });
});
