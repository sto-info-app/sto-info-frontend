import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  Character,
  CharacterWithAppearances,
} from 'src/app/models/storytime.models';
import { CharacterService } from '../../character.service';
import { StorytimeCharacterDetailComponent } from './storytime-character-detail.component';

describe('StorytimeCharacterDetailComponent', () => {
  let fixture: ComponentFixture<StorytimeCharacterDetailComponent>;
  let characterService: { getCharacter: jest.Mock };
  let params: BehaviorSubject<Map<string, string>>;

  /**
   * Builds a Character.
   *
   * @param overrides - Fields to change.
   * @returns The Character.
   */
  const buildCharacter = (overrides: Partial<Character> = {}): Character =>
    ({
      id: 'character-1',
      storyId: 'story-1',
      slug: 'captain-shran',
      name: 'Captain Shran',
      shortBio: 'An Andorian officer.',
      biographyHtml: '<p id="b1">A long service record.</p>',
      portraitImageUrl: null,
      portraitImageThumbnailUrl: null,
      portraitImageAlt: null,
      species: 'Andorian',
      faction: null,
      rank: 'Captain',
      occupation: null,
      affiliation: null,
      shipAssignment: null,
      traits: null,
      isPrimary: false,
      displayOrder: 1000,
      ...overrides,
    }) as Character;

  /**
   * Builds the response for the page.
   *
   * @param overrides - Fields to change.
   * @returns The response.
   */
  const buildResponse = (
    overrides: Partial<CharacterWithAppearances> = {},
  ): CharacterWithAppearances => ({
    character: buildCharacter(),
    appearsIn: [],
    ...overrides,
  });

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StorytimeCharacterDetailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new BehaviorSubject(
      new Map([
        ['storySlug', 'a-story'],
        ['characterSlug', 'captain-shran'],
      ]),
    );
    characterService = {
      getCharacter: jest.fn().mockReturnValue(of(buildResponse())),
    };

    TestBed.configureTestingModule({
      imports: [StorytimeCharacterDetailComponent],
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: characterService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('shows the Character', () => {
    const element = render();

    expect(element.textContent).toContain('Captain Shran');
    expect(element.textContent).toContain('An Andorian officer.');
  });

  it('renders the server-rendered biography', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-character__biography')?.innerHTML,
    ).toContain('A long service record.');
  });

  it('says nothing about a Character with no biography', () => {
    characterService.getCharacter.mockReturnValue(
      of(
        buildResponse({
          character: buildCharacter({ biographyHtml: null }),
        }),
      ),
    );

    const element = render();

    expect(element.querySelector('.storytime-character__biography')).toBeNull();
  });

  it('marks a main Character as such', () => {
    characterService.getCharacter.mockReturnValue(
      of(buildResponse({ character: buildCharacter({ isPrimary: true }) })),
    );

    const element = render();

    expect(element.textContent).toContain('Main Character');
  });

  describe('the profile', () => {
    // A Character with only a species should show one row, not a table of
    // blanks.
    it('shows only the fields that have been filled in', () => {
      const element = render();
      const rows = element.querySelectorAll(
        '.storytime-character__profile-row',
      );

      expect(rows).toHaveLength(2);
      expect(element.textContent).toContain('Andorian');
      expect(element.textContent).toContain('Captain');
    });

    it('shows no profile at all when nothing is filled in', () => {
      characterService.getCharacter.mockReturnValue(
        of(
          buildResponse({
            character: buildCharacter({ species: null, rank: null }),
          }),
        ),
      );

      const element = render();

      expect(element.querySelector('.storytime-character__profile')).toBeNull();
    });

    // An empty string is not a value worth a row of its own.
    it('ignores a field left blank', () => {
      characterService.getCharacter.mockReturnValue(
        of(
          buildResponse({
            character: buildCharacter({ species: '', rank: 'Captain' }),
          }),
        ),
      );

      const element = render();

      expect(
        element.querySelectorAll('.storytime-character__profile-row'),
      ).toHaveLength(1);
    });

    it('reports no fields before the Character has loaded', () => {
      characterService.getCharacter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.componentInstance.profileFields).toEqual([]);
    });
  });

  describe('traits', () => {
    it('lists them', () => {
      characterService.getCharacter.mockReturnValue(
        of(
          buildResponse({
            character: buildCharacter({ traits: ['Loyal', 'Blunt'] }),
          }),
        ),
      );

      const element = render();

      expect(element.textContent).toContain('Loyal');
      expect(element.textContent).toContain('Blunt');
    });

    it('shows nothing when there are none', () => {
      const element = render();

      expect(element.querySelector('.storytime-character__traits')).toBeNull();
    });

    it('shows nothing for an empty list', () => {
      characterService.getCharacter.mockReturnValue(
        of(buildResponse({ character: buildCharacter({ traits: [] }) })),
      );

      const element = render();

      expect(element.querySelector('.storytime-character__traits')).toBeNull();
    });
  });

  describe('appearances', () => {
    it('links to each Chapter they appear in', () => {
      characterService.getCharacter.mockReturnValue(
        of(
          buildResponse({
            appearsIn: [
              {
                chapterId: 'chapter-1',
                chapterSlug: 'chapter-one',
                chapterTitle: 'Chapter One',
                isPrimary: true,
              },
            ],
          }),
        ),
      );

      const element = render();
      const link = element.querySelector('.storytime-character__appearances a');

      expect(link?.textContent).toContain('Chapter One');
      expect(link?.getAttribute('href')).toContain('chapter-one');
    });

    it('marks the Chapters they are central to', () => {
      characterService.getCharacter.mockReturnValue(
        of(
          buildResponse({
            appearsIn: [
              {
                chapterId: 'chapter-1',
                chapterSlug: 'chapter-one',
                chapterTitle: 'Chapter One',
                isPrimary: true,
              },
            ],
          }),
        ),
      );

      const element = render();

      expect(element.textContent).toContain('Central');
    });

    // Their appearances may all be in Chapters nobody can open yet, which is
    // not the same as them appearing nowhere.
    it('explains an empty list', () => {
      const element = render();

      expect(element.textContent).toContain('not appeared in any published');
    });
  });

  it('reloads when the route moves to another Character', () => {
    render();

    params.next(
      new Map([
        ['storySlug', 'a-story'],
        ['characterSlug', 't-pol'],
      ]),
    );

    expect(characterService.getCharacter).toHaveBeenLastCalledWith(
      'a-story',
      't-pol',
    );
  });

  it('asks for empty slugs when the route carries none', () => {
    params.next(new Map());

    render();

    expect(characterService.getCharacter).toHaveBeenCalledWith('', '');
  });

  it('explains a missing Character', () => {
    characterService.getCharacter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    characterService.getCharacter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });
});
