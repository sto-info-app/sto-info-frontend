import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CreditableMember,
  CrewCredit,
  CrewCreditScope,
  CrewRole,
  ManagedChapter,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';
import { CreditListComponent } from './credit-list.component';

/** Longer than the search debounce, so a typed name reaches the server. */
const PAST_THE_DEBOUNCE_MS = 400;

describe('CreditListComponent', () => {
  let fixture: ComponentFixture<CreditListComponent>;
  let component: CreditListComponent;
  let crewService: {
    getMyCredits: jest.Mock;
    getRoles: jest.Mock;
    findCreditableMembers: jest.Mock;
    addCredit: jest.Mock;
    updateCredit: jest.Mock;
    removeCredit: jest.Mock;
  };
  let chapterService: { getMyChapters: jest.Mock };
  let characterService: { getMyCharacters: jest.Mock };
  let confirm: ConfirmPromptDouble;
  let routeParams: Map<string, string>;

  const role: CrewRole = {
    id: 'role-1',
    code: 'NARRATOR',
    name: 'Narrator',
    description: 'Reads it aloud.',
    displayOrder: 7000,
  };

  const chapter = {
    id: 'chapter-1',
    title: 'Chapter One',
  } as ManagedChapter;

  const character = {
    id: 'character-1',
    name: 'Shran',
  } as ManagedCharacter;

  /**
   * Builds a credit.
   *
   * @param overrides - Fields to change.
   * @returns The credit.
   */
  const buildCredit = (overrides: Partial<CrewCredit> = {}): CrewCredit =>
    ({
      id: 'credit-1',
      storyId: 'story-1',
      chapterId: null,
      characterId: null,
      username: 'captain.picard',
      scope: CrewCreditScope.STORY,
      role,
      displayLabel: 'Narrator',
      notes: null,
      orderIndex: 1000,
      ...overrides,
    }) as CrewCredit;

  /**
   * Builds a member the search could offer.
   *
   * @param overrides - Fields to change.
   * @returns The member.
   */
  const buildMember = (
    overrides: Partial<CreditableMember> = {},
  ): CreditableMember => ({
    username: 'captain.picard',
    profilePicture100: null,
    isCollaborator: true,
    ...overrides,
  });

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(CreditListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Fills the form with the least a credit needs.
   */
  const fillMinimally = (): void => {
    component.form.patchValue({
      username: 'captain.picard',
      roleId: 'role-1',
    });
  };

  beforeEach(() => {
    crewService = {
      getMyCredits: jest.fn().mockReturnValue(of([buildCredit()])),
      getRoles: jest.fn().mockReturnValue(of([role])),
      findCreditableMembers: jest.fn().mockReturnValue(of([buildMember()])),
      addCredit: jest.fn().mockReturnValue(of(buildCredit())),
      updateCredit: jest.fn().mockReturnValue(of(buildCredit())),
      removeCredit: jest.fn().mockReturnValue(of(undefined)),
    };
    chapterService = {
      getMyChapters: jest.fn().mockReturnValue(of([chapter])),
    };
    characterService = {
      getMyCharacters: jest.fn().mockReturnValue(of([character])),
    };

    confirm = stubConfirmPrompt();
    routeParams = new Map([['storyId', 'story-1']]);

    TestBed.configureTestingModule({
      imports: [CreditListComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: CrewService, useValue: crewService },
        { provide: ChapterService, useValue: chapterService },
        { provide: CharacterService, useValue: characterService },
        {
          provide: ActivatedRoute,
          // A getter, so a test may empty the route before the component is
          // created.
          useValue: {
            snapshot: {
              get paramMap() {
                return routeParams;
              },
            },
          },
        },
      ],
    });
  });

  it('lists who is credited and for what', () => {
    const element = render();

    expect(element.textContent).toContain('captain.picard');
    expect(element.textContent).toContain('Narrator');
  });

  // A credit confers nothing at all, and a page that let somebody believe
  // otherwise would be worse than no page.
  it('says plainly that a credit grants no access', () => {
    expect(render().textContent).toContain('gives them no access');
  });

  // Reached only by a hand-typed address, but the page still has to load
  // rather than send the server a request for the credits of nothing.
  it('holds no Story when the address names none', () => {
    routeParams.clear();

    render();

    expect(component.storyId).toBe('');
    expect(crewService.getMyCredits).toHaveBeenCalledWith('');
  });

  it('invites a first credit when there are none', () => {
    crewService.getMyCredits.mockReturnValue(of([]));

    expect(render().textContent).toContain('Nobody is credited');
  });

  describe('what a credit is attached to', () => {
    it('says the whole Story when nothing else is named', () => {
      render();

      expect(component.scopeOf(buildCredit())).toBe('The whole Story');
    });

    it('names the Chapter a Chapter credit is for', () => {
      render();

      expect(component.scopeOf(buildCredit({ chapterId: 'chapter-1' }))).toBe(
        'Chapter One',
      );
    });

    it('names the Character a Character credit is for', () => {
      render();

      expect(
        component.scopeOf(buildCredit({ characterId: 'character-1' })),
      ).toBe('Shran');
    });

    // A Chapter deleted out from under a credit should still leave something
    // readable rather than a blank line.
    it('says what kind of thing is missing when it cannot name it', () => {
      render();

      expect(component.scopeOf(buildCredit({ chapterId: 'gone' }))).toBe(
        'a Chapter',
      );
      expect(component.scopeOf(buildCredit({ characterId: 'gone' }))).toBe(
        'a Character',
      );
    });
  });

  // A credit for somebody who has closed their account stays until the creator
  // takes it off, and says so rather than showing a blank name.
  it('says when the member a credit names has left', () => {
    crewService.getMyCredits.mockReturnValue(
      of([buildCredit({ username: null })]),
    );

    const element = render();

    expect(element.textContent).toContain('no longer here');
    expect(component.describe(buildCredit({ username: null }))).toContain(
      'A member who has left',
    );
  });

  describe('finding somebody to credit', () => {
    it('searches once enough has been typed', fakeAsync(() => {
      render();
      component.form.controls.username.setValue('pic');
      tick(PAST_THE_DEBOUNCE_MS);

      expect(crewService.findCreditableMembers).toHaveBeenCalledWith(
        'story-1',
        'pic',
      );
      expect(component.matches).toHaveLength(1);
    }));

    // A single letter would match most of the site and tell nobody anything.
    it('does not search on too little', fakeAsync(() => {
      render();
      component.form.controls.username.setValue('p');
      tick(PAST_THE_DEBOUNCE_MS);

      expect(crewService.findCreditableMembers).not.toHaveBeenCalled();
      expect(component.matches).toEqual([]);
    }));

    // An exact match is what was asked for, not a suggestion to act on.
    it('offers nothing once the name is typed in full', fakeAsync(() => {
      render();
      component.form.controls.username.setValue('captain.picard');
      tick(PAST_THE_DEBOUNCE_MS);

      expect(component.matches).toEqual([]);
    }));

    it('offers the alternatives when several match', fakeAsync(() => {
      crewService.findCreditableMembers.mockReturnValue(
        of([buildMember(), buildMember({ username: 'captain.picardo' })]),
      );
      render();
      component.form.controls.username.setValue('captain.picard');
      tick(PAST_THE_DEBOUNCE_MS);

      expect(component.matches).toHaveLength(2);
    }));

    // A search is a convenience. Failing one is no reason to stop somebody
    // typing a name they already know.
    it('offers nothing when the search fails', fakeAsync(() => {
      crewService.findCreditableMembers.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();
      component.form.controls.username.setValue('pic');
      tick(PAST_THE_DEBOUNCE_MS);

      expect(component.matches).toEqual([]);
      expect(component.errorMessage).toBe('');
    }));

    it('fills the field from a chosen member', () => {
      render();
      component.matches = [buildMember()];

      component.choose(buildMember());

      expect(component.form.getRawValue().username).toBe('captain.picard');
      expect(component.matches).toEqual([]);
    });
  });

  describe('adding a credit', () => {
    it('refuses a credit that names nobody', () => {
      render();
      component.add();

      expect(crewService.addCredit).not.toHaveBeenCalled();
    });

    it('sends the least a credit needs, and nothing empty', () => {
      render();
      fillMinimally();

      component.add();

      expect(crewService.addCredit).toHaveBeenCalledWith('story-1', {
        username: 'captain.picard',
        roleId: 'role-1',
      });
    });

    it('sends the whole credit when one is described in full', () => {
      render();
      component.form.setValue({
        username: '  captain.picard  ',
        roleId: 'role-1',
        chapterId: 'chapter-1',
        characterId: 'character-1',
        creditLabel: '  Additional dialogue  ',
        notes: '  For the bridge scenes.  ',
        validFromChapterId: 'chapter-1',
        validToChapterId: 'chapter-1',
      });

      component.add();

      expect(crewService.addCredit).toHaveBeenCalledWith('story-1', {
        username: 'captain.picard',
        roleId: 'role-1',
        chapterId: 'chapter-1',
        characterId: 'character-1',
        creditLabel: 'Additional dialogue',
        notes: 'For the bridge scenes.',
        validFromChapterId: 'chapter-1',
        validToChapterId: 'chapter-1',
      });
    });

    it('empties the form once the credit is added', () => {
      render();
      fillMinimally();
      component.matches = [buildMember()];

      component.add();

      expect(component.form.getRawValue().username).toBe('');
      expect(component.matches).toEqual([]);
      expect(crewService.getMyCredits).toHaveBeenCalledTimes(2);
    });

    // A credit that stops applying without ever having started describes
    // nothing, which is what the server refuses.
    it('refuses an end without a beginning', () => {
      render();
      fillMinimally();
      component.form.patchValue({ validToChapterId: 'chapter-1' });

      component.add();

      expect(component.needsStartingChapter).toBe(true);
      expect(crewService.addCredit).not.toHaveBeenCalled();
    });

    it('allows a beginning without an end', () => {
      render();
      fillMinimally();
      component.form.patchValue({ validFromChapterId: 'chapter-1' });

      component.add();

      expect(component.needsStartingChapter).toBe(false);
      expect(crewService.addCredit).toHaveBeenCalled();
    });

    // The server names the specific problem — an unknown username, or a credit
    // that already exists — which is more use than a generic apology.
    it('reports what the server said', () => {
      crewService.addCredit.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: "No member is called 'nobody'" },
            }),
        ),
      );
      render();
      fillMinimally();

      component.add();

      expect(component.errorMessage).toBe("No member is called 'nobody'");
    });
  });

  describe('rewording a credit', () => {
    it('opens with the wording the credit already reads as', () => {
      render();

      component.startEdit(buildCredit({ notes: 'For the bridge scenes.' }));

      expect(component.editingCreditId).toBe('credit-1');
      expect(component.editForm.getRawValue()).toEqual({
        creditLabel: 'Narrator',
        notes: 'For the bridge scenes.',
      });
    });

    it('opens with empty notes when there are none', () => {
      render();

      component.startEdit(buildCredit());

      expect(component.editForm.getRawValue().notes).toBe('');
    });

    it('saves the new wording and closes', () => {
      render();
      component.startEdit(buildCredit());
      component.editForm.patchValue({ creditLabel: '  Storyteller  ' });

      component.saveEdit();

      expect(crewService.updateCredit).toHaveBeenCalledWith('credit-1', {
        creditLabel: 'Storyteller',
        notes: '',
      });
      expect(component.editingCreditId).toBeNull();
    });

    it('leaves the wording as it was on cancel', () => {
      render();
      component.startEdit(buildCredit());

      component.cancelEdit();

      expect(component.editingCreditId).toBeNull();
      expect(crewService.updateCredit).not.toHaveBeenCalled();
    });

    // A guard for a state the template already prevents, kept because the
    // method is public and nothing stops it being called first.
    it('saves nothing when no credit is open', () => {
      render();

      component.saveEdit();

      expect(crewService.updateCredit).not.toHaveBeenCalled();
    });
  });

  describe('removing a credit', () => {
    it('removes it and reloads', () => {
      render();

      component.remove(buildCredit());

      expect(crewService.removeCredit).toHaveBeenCalledWith('credit-1');
      expect(crewService.getMyCredits).toHaveBeenCalledTimes(2);
    });

    it('asks first, naming who is credited and for what', () => {
      render();

      component.remove(buildCredit());

      expect(confirm.lastAsked()?.title).toBe('Remove credit');
      expect(confirm.lastAsked()?.message).toContain('captain.picard');
      expect(confirm.lastAsked()?.message).toContain('Narrator');
    });

    it('keeps the credit when the creator says no', () => {
      confirm.answer(false);
      render();

      component.remove(buildCredit());

      expect(crewService.removeCredit).not.toHaveBeenCalled();
    });
  });

  describe('when the page cannot be loaded', () => {
    it('says plainly when the Story is not theirs to credit', () => {
      crewService.getMyCredits.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );

      expect(render().textContent).toContain('do not have access');
    });

    it('reports another failure differently', () => {
      crewService.getMyCredits.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      expect(render().textContent).toContain('could not be loaded');
    });

    it('stops loading after a failure', () => {
      crewService.getMyCredits.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      expect(component.isLoading).toBe(false);
    });

    // A chooser that could not be filled is still a page a creator can credit
    // the whole Story from.
    it.each([
      ['the roles', () => crewService.getRoles, 'roles'],
      ['the Chapters', () => chapterService.getMyChapters, 'chapters'],
      ['the cast', () => characterService.getMyCharacters, 'cast'],
    ] as const)('carries on without %s', (_what, mock, key) => {
      mock().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(component[key]).toEqual([]);
      expect(component.errorMessage).toBe('');
      expect(component.credits).toHaveLength(1);
    });
  });
});
