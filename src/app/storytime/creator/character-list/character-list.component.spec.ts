import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CopyableCharacterStory,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { CharacterService } from '../../character.service';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';
import { CharacterListComponent } from './character-list.component';

describe('CharacterListComponent', () => {
  let fixture: ComponentFixture<CharacterListComponent>;
  let characterService: {
    getMyCharacters: jest.Mock;
    reorderCharacters: jest.Mock;
    deleteCharacter: jest.Mock;
    getCopyableCharacters: jest.Mock;
    copyCharacter: jest.Mock;
  };
  let confirm: ConfirmPromptDouble;

  /**
   * Builds a Character.
   *
   * @param id - The Character identifier.
   * @param name - Their name.
   * @returns The Character.
   */
  const buildCharacter = (id: string, name: string): ManagedCharacter =>
    ({
      id,
      storyId: 'story-1',
      slug: name.toLowerCase(),
      name,
      shortBio: null,
      portraitImageThumbnailUrl: null,
      portraitImageAlt: null,
      isPrimary: false,
      displayOrder: 1000,
      version: 1,
    }) as ManagedCharacter;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(CharacterListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    characterService = {
      getMyCharacters: jest
        .fn()
        .mockReturnValue(
          of([buildCharacter('a', 'Shran'), buildCharacter('b', 'T’Pol')]),
        ),
      reorderCharacters: jest.fn().mockReturnValue(of([])),
      deleteCharacter: jest.fn().mockReturnValue(of(undefined)),
      getCopyableCharacters: jest.fn().mockReturnValue(of([])),
      copyCharacter: jest.fn(),
    };

    confirm = stubConfirmPrompt();

    TestBed.configureTestingModule({
      imports: [CharacterListComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: CharacterService, useValue: characterService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['storyId', 'story-1']]) },
          },
        },
      ],
    });
  });

  // sc-1483: copying a Character from another of the creator's Stories.
  describe('copying from another Story', () => {
    const stories: CopyableCharacterStory[] = [
      {
        storyId: 'story-2',
        storyTitle: 'Another Story',
        characters: [
          {
            id: 'source-1',
            name: 'Jhamel',
            shortBio: 'An Aenar telepath.',
            portraitImageThumbnailUrl: null,
            portraitImageAlt: null,
          },
        ],
      },
    ];

    /**
     * Finds a button by what it says.
     *
     * @param element - The rendered page.
     * @param text - Its text.
     * @returns The button, or undefined.
     */
    const buttonSaying = (
      element: HTMLElement,
      text: string,
    ): HTMLButtonElement | undefined =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].find(
        button => button.textContent?.trim() === text,
      );

    /**
     * Opens the picker through its button.
     *
     * @returns The rendered page.
     */
    const openPicker = (): HTMLElement => {
      const element = render();
      buttonSaying(element, 'Copy from another Story')?.click();
      fixture.detectChanges();
      return element;
    };

    it('keeps the picker closed until asked', () => {
      const element = render();
      const toggle = buttonSaying(element, 'Copy from another Story');

      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(
        element.querySelector('#storytime-character-copy-picker'),
      ).toBeNull();
      expect(characterService.getCopyableCharacters).not.toHaveBeenCalled();
    });

    it('lists the Characters of the creator’s other Stories', () => {
      characterService.getCopyableCharacters.mockReturnValue(of(stories));

      const element = openPicker();
      const picker = element.querySelector('#storytime-character-copy-picker');

      expect(characterService.getCopyableCharacters).toHaveBeenCalledWith(
        'story-1',
      );
      expect(
        buttonSaying(element, 'Copy from another Story')?.getAttribute(
          'aria-expanded',
        ),
      ).toBe('true');
      expect(picker?.textContent).toContain('Another Story');
      expect(picker?.textContent).toContain('Jhamel');
      expect(picker?.textContent).toContain('An Aenar telepath.');
      expect(
        picker?.querySelector('button[aria-label="Copy Jhamel"]'),
      ).toBeTruthy();
    });

    it('says so when there is nothing to copy', () => {
      const element = openPicker();

      expect(element.textContent).toContain(
        'None of your other Stories has a Character to copy.',
      );
    });

    it('says so when the other Stories could not be loaded', () => {
      characterService.getCopyableCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = openPicker();

      expect(element.textContent).toContain(
        'Your other Stories could not be loaded.',
      );
      expect(element.textContent).not.toContain(
        'None of your other Stories has a Character to copy.',
      );
    });

    it('closes the picker again', () => {
      const element = openPicker();

      buttonSaying(element, 'Copy from another Story')?.click();
      fixture.detectChanges();

      expect(
        element.querySelector('#storytime-character-copy-picker'),
      ).toBeNull();
    });

    it('copies the Character, then opens the copy with the original portrait', () => {
      const router = TestBed.inject(Router);
      const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      const originalPortrait = {
        url: 'https://cdn.example.test/portrait-1/public',
        alt: 'Jhamel in the ice caves',
      };
      characterService.getCopyableCharacters.mockReturnValue(of(stories));
      characterService.copyCharacter.mockReturnValue(
        of({
          character: buildCharacter('copy-1', 'Jhamel'),
          originalPortrait,
        }),
      );

      const element = openPicker();
      element
        .querySelector<HTMLButtonElement>('button[aria-label="Copy Jhamel"]')
        ?.click();

      expect(characterService.copyCharacter).toHaveBeenCalledWith(
        'story-1',
        'source-1',
      );
      expect(navigate).toHaveBeenCalledWith(
        ['/', 'storytime', 'manage', 'characters', 'copy-1'],
        { state: { copiedCharacterId: 'copy-1', originalPortrait } },
      );
      expect(fixture.componentInstance.copyingId).toBeNull();
    });

    it('does not start a second copy while one is in flight', () => {
      characterService.getCopyableCharacters.mockReturnValue(of(stories));
      openPicker();
      fixture.componentInstance.copyingId = 'source-1';

      fixture.componentInstance.copy(stories[0].characters[0]);

      expect(characterService.copyCharacter).not.toHaveBeenCalled();
    });

    it.each([
      [
        400,
        {
          message: 'A Character an administrator has removed cannot be copied.',
        },
        'A Character an administrator has removed cannot be copied.',
      ],
      [403, null, 'You may no longer manage the cast of one of those Stories.'],
      [
        400,
        null,
        'That Character could not be copied. Please try again shortly.',
      ],
      [
        500,
        null,
        'That Character could not be copied. Please try again shortly.',
      ],
    ])('says why a copy failed (%s)', (status, error, message) => {
      characterService.getCopyableCharacters.mockReturnValue(of(stories));
      characterService.copyCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error })),
      );

      const element = openPicker();
      element
        .querySelector<HTMLButtonElement>('button[aria-label="Copy Jhamel"]')
        ?.click();
      fixture.detectChanges();

      expect(element.textContent).toContain(message);
      expect(fixture.componentInstance.copyingId).toBeNull();
    });
  });

  it('lists the cast', () => {
    const element = render();

    expect(element.textContent).toContain('Shran');
    expect(element.textContent).toContain('T’Pol');
    expect(characterService.getMyCharacters).toHaveBeenCalledWith('story-1');
  });

  // The panel is where a creator checks their cast at a glance, so what has
  // been recorded about a Character belongs on it rather than a page away.
  it('shows what has been recorded about a Character', () => {
    characterService.getMyCharacters.mockReturnValue(
      of([
        {
          ...buildCharacter('a', 'Shran'),
          rank: 'Commander',
          species: 'Andorian',
          faction: 'Starfleet',
          occupation: 'Executive Officer',
          affiliation: 'Andorian Imperial Guard',
          shipAssignment: 'USS Kumari',
          shortBio: 'An Andorian officer.',
          traits: ['Loyal'],
        },
      ]),
    );

    const entry = render().querySelector('.storytime-cast-entry');

    expect(entry?.textContent).toContain('Commander');
    expect(entry?.textContent).toContain('Andorian');
    expect(entry?.textContent).toContain('Starfleet');
    expect(entry?.textContent).toContain('Executive Officer');
    expect(entry?.textContent).toContain('Andorian Imperial Guard');
    expect(entry?.textContent).toContain('USS Kumari');
    expect(entry?.textContent).toContain('An Andorian officer.');
    expect(entry?.textContent).toContain('Loyal');
  });

  it('says so when nothing has been recorded about a Character', () => {
    const entry = render().querySelector('.storytime-cast-entry');

    expect(entry?.textContent).toContain(
      'Nothing has been recorded about them yet.',
    );
  });

  it('offers a way to edit each Character', () => {
    const element = render();

    expect(
      element
        .querySelector('[aria-label="Edit this Character"]')
        ?.getAttribute('href'),
    ).toBe('/storytime/manage/characters/a');
  });

  it('explains a Story with no Characters yet', () => {
    characterService.getMyCharacters.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('no Characters yet');
  });

  describe('reordering', () => {
    // The whole order is sent because that is what the server accepts: a
    // partial list would leave everyone else at meaningless positions.
    it('sends the whole order when moving a Character up', () => {
      render();

      fixture.componentInstance.moveUp(1);

      expect(characterService.reorderCharacters).toHaveBeenCalledWith(
        'story-1',
        ['b', 'a'],
      );
    });

    it('sends the whole order when moving a Character down', () => {
      render();

      fixture.componentInstance.moveDown(0);

      expect(characterService.reorderCharacters).toHaveBeenCalledWith(
        'story-1',
        ['b', 'a'],
      );
    });

    it('does nothing moving the first Character up', () => {
      render();

      fixture.componentInstance.moveUp(0);

      expect(characterService.reorderCharacters).not.toHaveBeenCalled();
    });

    it('does nothing moving the last Character down', () => {
      render();

      fixture.componentInstance.moveDown(1);

      expect(characterService.reorderCharacters).not.toHaveBeenCalled();
    });

    it('reloads so the list reflects what the server did', () => {
      render();

      fixture.componentInstance.moveDown(0);

      expect(characterService.getMyCharacters).toHaveBeenCalledTimes(2);
    });

    it('explains a reorder that could not be saved', () => {
      characterService.reorderCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      fixture.componentInstance.moveDown(0);
      fixture.detectChanges();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
      expect(fixture.componentInstance.isLoading).toBe(false);
    });
  });

  describe('deleting', () => {
    it('deletes a Character and reloads', () => {
      render();

      fixture.componentInstance.remove(buildCharacter('a', 'Shran'));

      expect(characterService.deleteCharacter).toHaveBeenCalledWith('a');
      expect(characterService.getMyCharacters).toHaveBeenCalledTimes(2);
    });

    // Deleting a Character takes their portrait, biography and every Chapter
    // appearance with them, and none of it comes back.
    it('asks first, naming the Character', () => {
      render();

      fixture.componentInstance.remove(buildCharacter('a', 'Shran'));

      expect(confirm.lastAsked()?.title).toBe('Delete Character');
      expect(confirm.lastAsked()?.message).toContain('Shran');
    });

    it('leaves the Character alone when the creator says no', () => {
      confirm.answer(false);
      render();

      fixture.componentInstance.remove(buildCharacter('a', 'Shran'));

      expect(characterService.deleteCharacter).not.toHaveBeenCalled();
    });

    it('explains a deletion that failed', () => {
      characterService.deleteCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      fixture.componentInstance.remove(buildCharacter('a', 'Shran'));

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });
  });

  describe('when the list cannot be loaded', () => {
    it('says plainly when the Story is not theirs', () => {
      characterService.getMyCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );

      const element = render();

      expect(element.textContent).toContain('not your Story');
    });

    it('reports another failure differently', () => {
      characterService.getMyCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('could not be loaded');
    });

    it('stops loading after a failure', () => {
      characterService.getMyCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.componentInstance.isLoading).toBe(false);
    });
  });

  it('asks for an empty Story when the route carries none', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { paramMap: new Map() } },
    });

    render();

    expect(characterService.getMyCharacters).toHaveBeenCalledWith('');
  });
});
