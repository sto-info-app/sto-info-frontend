import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedCharacter } from 'src/app/models/storytime.models';
import { CharacterService } from '../../character.service';
import { CharacterEditorComponent } from './character-editor.component';

describe('CharacterEditorComponent', () => {
  let fixture: ComponentFixture<CharacterEditorComponent>;
  let characterService: {
    getMyCharacter: jest.Mock;
    createCharacter: jest.Mock;
    updateCharacter: jest.Mock;
  };
  let router: { navigate: jest.Mock };
  let params: Map<string, string>;

  /**
   * Builds a Character.
   *
   * @param overrides - Fields to change.
   * @returns The Character.
   */
  const buildCharacter = (
    overrides: Partial<ManagedCharacter> = {},
  ): ManagedCharacter =>
    ({
      id: 'character-1',
      storyId: 'story-1',
      slug: 'captain-shran',
      name: 'Captain Shran',
      shortBio: 'An Andorian officer.',
      biographySource: 'A long history.',
      species: 'Andorian',
      faction: null,
      rank: 'Captain',
      occupation: null,
      affiliation: null,
      shipAssignment: null,
      portraitImageId: null,
      portraitImageAlt: null,
      traits: ['Loyal'],
      isPrimary: true,
      version: 3,
      ...overrides,
    }) as ManagedCharacter;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(CharacterEditorComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new Map([['storyId', 'story-1']]);
    characterService = {
      getMyCharacter: jest.fn().mockReturnValue(of(buildCharacter())),
      createCharacter: jest.fn().mockReturnValue(of(buildCharacter())),
      updateCharacter: jest.fn().mockReturnValue(of(buildCharacter())),
    };
    router = { navigate: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [CharacterEditorComponent],
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: characterService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: params } },
        },
      ],
    });
  });

  describe('creating', () => {
    it('offers an empty form', () => {
      const element = render();

      expect(fixture.componentInstance.isCreating).toBe(true);
      expect(element.textContent).toContain('Add a Character');
      expect(characterService.getMyCharacter).not.toHaveBeenCalled();
    });

    it('creates the Character', () => {
      render();
      fixture.componentInstance.form.patchValue({ name: 'Captain Shran' });

      fixture.componentInstance.save();

      expect(characterService.createCharacter).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ name: 'Captain Shran' }),
      );
    });

    // A Character needs a name and nothing else, so an empty form is the one
    // thing that must not be saved.
    it('refuses to save without a name', () => {
      render();

      fixture.componentInstance.save();

      expect(characterService.createCharacter).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.controls.name.touched).toBe(true);
    });

    // Sending a blank field would clear a value the creator never touched.
    it('omits the fields left blank', () => {
      render();
      fixture.componentInstance.form.patchValue({
        name: 'Captain Shran',
        rank: 'Captain',
      });

      fixture.componentInstance.save();

      const payload = characterService.createCharacter.mock.calls[0][1];
      expect(payload.rank).toBe('Captain');
      expect(payload).not.toHaveProperty('species');
      expect(payload).not.toHaveProperty('slug');
    });

    it('trims what it sends', () => {
      render();
      fixture.componentInstance.form.patchValue({
        name: 'Captain Shran',
        rank: '  Captain  ',
      });

      fixture.componentInstance.save();

      expect(characterService.createCharacter.mock.calls[0][1].rank).toBe(
        'Captain',
      );
    });

    it('goes back to the cast list afterwards', () => {
      render();
      fixture.componentInstance.form.patchValue({ name: 'Captain Shran' });

      fixture.componentInstance.save();

      expect(router.navigate).toHaveBeenCalledWith([
        '/',
        'storytime',
        'manage',
        'stories',
        'story-1',
        'characters',
      ]);
    });
  });

  describe('editing', () => {
    // Mutated rather than replaced: the route provider already holds this map
    // by reference, so a new one would never reach the component.
    beforeEach(() => {
      params.clear();
      params.set('characterId', 'character-1');
    });

    it('fills the form from the Character', () => {
      render();
      const value = fixture.componentInstance.form.getRawValue();

      expect(value.name).toBe('Captain Shran');
      expect(value.rank).toBe('Captain');
      expect(value.isPrimary).toBe(true);
      expect(fixture.componentInstance.traits.length).toBe(1);
    });

    // A Character created with nothing but a name has every other field null,
    // and each has to reach the form as an empty box rather than the word
    // "null".
    it('replaces nulls with empty fields', () => {
      characterService.getMyCharacter.mockReturnValue(
        of(
          buildCharacter({
            shortBio: null,
            species: null,
            faction: null,
            rank: null,
            occupation: null,
            affiliation: null,
            shipAssignment: null,
            portraitImageId: null,
            portraitImageAlt: null,
            traits: null,
          }),
        ),
      );

      render();
      const value = fixture.componentInstance.form.getRawValue();

      expect(Object.values(value).filter(entry => entry === null)).toEqual([]);
      expect(value.shortBio).toBe('');
      expect(value.rank).toBe('');
      expect(fixture.componentInstance.traits.length).toBe(0);
    });

    // Sending the version back is what makes a stale edit fail rather than
    // overwrite somebody else's.
    it('sends the version it loaded', () => {
      render();

      fixture.componentInstance.save();

      expect(characterService.updateCharacter).toHaveBeenCalledWith(
        'character-1',
        expect.objectContaining({ version: 3 }),
      );
    });

    it('explains a stale edit', () => {
      characterService.updateCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409 })),
      );
      render();

      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'changed since you opened it',
      );
      expect(fixture.componentInstance.isSaving).toBe(false);
    });

    it('reports another save failure differently', () => {
      characterService.updateCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });

    it('explains a Character that could not be found', () => {
      characterService.getMyCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be found',
      );
    });

    it('reports another load failure differently', () => {
      characterService.getMyCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });
  });

  describe('traits', () => {
    it('adds a row', () => {
      render();

      fixture.componentInstance.addTrait();

      expect(fixture.componentInstance.traits.length).toBe(1);
    });

    it('removes a row', () => {
      render();
      fixture.componentInstance.addTrait();

      fixture.componentInstance.removeTrait(0);

      expect(fixture.componentInstance.traits.length).toBe(0);
    });

    it('stops at the limit', () => {
      render();

      for (let index = 0; index < 25; index++) {
        fixture.componentInstance.addTrait();
      }

      expect(fixture.componentInstance.traits.length).toBe(
        fixture.componentInstance.maxTraits,
      );
    });

    // An empty row left in the editor means nothing there, not a trait with
    // no name.
    it('drops blank rows when saving', () => {
      render();
      fixture.componentInstance.form.patchValue({ name: 'Captain Shran' });
      fixture.componentInstance.addTrait();
      fixture.componentInstance.addTrait();
      fixture.componentInstance.traits.at(0).setValue('Loyal');
      fixture.componentInstance.traits.at(1).setValue('   ');

      fixture.componentInstance.save();

      expect(characterService.createCharacter.mock.calls[0][1].traits).toEqual([
        'Loyal',
      ]);
    });
  });

  it('does not save twice at once', () => {
    characterService.createCharacter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    render();
    fixture.componentInstance.form.patchValue({ name: 'Captain Shran' });

    fixture.componentInstance.save();
    fixture.componentInstance.isSaving = true;
    fixture.componentInstance.save();

    expect(characterService.createCharacter).toHaveBeenCalledTimes(1);
  });
});
