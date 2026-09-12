import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  CollaborationInvitationStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';
import { COLLABORATOR_CAPABILITIES } from '../../storytime.constants';
import { CollaboratorPanelComponent } from './collaborator-panel.component';

/**
 * A page holding the panel, standing in for a Story or an Arc.
 *
 * The invitation form belongs to whichever page is using the panel, so a host
 * is the only honest way to render one.
 */
@Component({
  standalone: true,
  imports: [CollaboratorPanelComponent],
  template: `<app-collaborator-panel
    idPrefix="collaborator"
    emptyMessage="Nobody else is working on this yet."
    [form]="form"
    [capabilities]="capabilities"
    [collaborators]="collaborators"
    [isLoading]="false"
    (revoked)="revoked = revoked.concat($event)" />`,
})
class HostComponent {
  readonly capabilities = COLLABORATOR_CAPABILITIES;
  collaborators: Collaborator[] = [];
  revoked: Collaborator[] = [];
  form!: FormGroup;
}

describe('CollaboratorPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let confirm: ConfirmPromptDouble;

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
      canManageChapters: false,
      canManageCharacters: false,
      canManageCrew: false,
      canManageCollaborators: false,
      invitationStatus: CollaborationInvitationStatus.ACCEPTED,
      invitedByUserId: 'owner-1',
      invitedAt: '2026-06-01T00:00:00Z',
      acceptedAt: '2026-06-02T00:00:00Z',
      ...overrides,
    }) as Collaborator;

  /**
   * Renders the host with the given collaborations in the panel.
   *
   * @param collaborators - The collaborations to show.
   * @returns The rendered element.
   */
  const render = (collaborators: Collaborator[]): HTMLElement => {
    fixture = TestBed.createComponent(HostComponent);
    const fb = TestBed.inject(FormBuilder).nonNullable;
    const capabilityControls = Object.fromEntries(
      fixture.componentInstance.capabilities.map(capability => [
        capability.key,
        [false],
      ]),
    );
    fixture.componentInstance.form = fb.group({
      userId: [''],
      collaborationRole: [''],
      ...capabilityControls,
    });
    fixture.componentInstance.collaborators = collaborators;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Presses the button that ends a collaboration.
   *
   * @param element - The rendered element.
   */
  const pressEndButton = (element: HTMLElement): void => {
    const button = element.querySelector(
      '.storytime-collaborators__entry .lcars-btn',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    confirm = stubConfirmPrompt();

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [confirm.provider],
    });
  });

  it('says so when nobody is collaborating', () => {
    expect(render([]).textContent).toContain('Nobody else is working on this');
  });

  it('names each collaborator and where they stand', () => {
    const element = render([buildCollaborator()]);

    expect(element.textContent).toContain('Co-writer');
    expect(element.textContent).toContain('Collaborating');
  });

  it('falls back to the member when nobody has named them', () => {
    const element = render([buildCollaborator({ collaborationRole: null })]);

    expect(element.textContent).toContain('member-1');
  });

  it('says an invitation grants nothing until it is answered', () => {
    const element = render([
      buildCollaborator({
        invitationStatus: CollaborationInvitationStatus.INVITED,
      }),
    ]);

    expect(element.textContent).toContain('have not answered yet');
  });

  // The question is asked here rather than by each caller, so a Story's crew
  // and an Arc's curators cannot come to ask it differently.
  describe('ending a collaboration', () => {
    it('asks before removing somebody who has been working on it', () => {
      const element = render([buildCollaborator()]);

      pressEndButton(element);

      expect(confirm.lastAsked()?.title).toBe('Remove collaborator');
      expect(confirm.lastAsked()?.message).toContain('Co-writer');
      expect(confirm.lastAsked()?.message).toContain('lose access');
      expect(fixture.componentInstance.revoked).toHaveLength(1);
    });

    // Withdrawing an invitation takes away something nobody accepted; removing
    // a collaborator takes access away from somebody using it.
    it('words a withdrawn invitation differently', () => {
      const element = render([
        buildCollaborator({
          invitationStatus: CollaborationInvitationStatus.INVITED,
        }),
      ]);

      pressEndButton(element);

      expect(confirm.lastAsked()?.title).toBe('Withdraw invitation');
      expect(confirm.lastAsked()?.message).toContain('not be able to accept');
      expect(fixture.componentInstance.revoked).toHaveLength(1);
    });

    // Nobody has to have named a collaborator for the question to identify
    // them, so it falls back to the member the same way the list does.
    it('falls back to the member when nobody has named them', () => {
      const element = render([buildCollaborator({ collaborationRole: null })]);

      pressEndButton(element);

      expect(confirm.lastAsked()?.message).toContain('member-1');
    });

    it('ends nothing when the owner says no', () => {
      confirm.answer(false);
      const element = render([buildCollaborator()]);

      pressEndButton(element);

      expect(fixture.componentInstance.revoked).toEqual([]);
    });
  });
});
