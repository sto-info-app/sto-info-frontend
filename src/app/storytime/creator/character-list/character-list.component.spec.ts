import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedCharacter } from 'src/app/models/storytime.models';
import { CharacterService } from '../../character.service';
import { CharacterListComponent } from './character-list.component';

describe('CharacterListComponent', () => {
  let fixture: ComponentFixture<CharacterListComponent>;
  let characterService: {
    getMyCharacters: jest.Mock;
    reorderCharacters: jest.Mock;
    deleteCharacter: jest.Mock;
  };

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
    };

    TestBed.configureTestingModule({
      imports: [CharacterListComponent],
      providers: [
        provideRouter([]),
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
