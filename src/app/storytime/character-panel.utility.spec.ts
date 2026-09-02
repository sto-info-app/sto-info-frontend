import { Character } from 'src/app/models/storytime.models';
import { buildCharacterPanelVm } from './character-panel.utility';

describe('buildCharacterPanelVm', () => {
  /**
   * Builds a Character with nothing recorded about them.
   *
   * @param overrides - The fields this case cares about.
   * @returns The Character.
   */
  const buildCharacter = (overrides: Partial<Character> = {}): Character =>
    ({
      id: 'character-1',
      storyId: 'story-1',
      slug: 'shran',
      name: 'Shran',
      shortBio: null,
      biographyHtml: null,
      portraitImageUrl: null,
      portraitImageThumbnailUrl: null,
      portraitImageAlt: null,
      species: null,
      faction: null,
      rank: null,
      occupation: null,
      affiliation: null,
      shipAssignment: null,
      traits: null,
      isPrimary: false,
      displayOrder: 1000,
      ...overrides,
    }) as Character;

  // The rank is the headline of the panel rather than one row among the rest,
  // which is where a captain card puts it too.
  it('keeps the rank apart from the other facts', () => {
    const vm = buildCharacterPanelVm(
      buildCharacter({ rank: 'Commander', species: 'Andorian' }),
    );

    expect(vm.rank).toBe('Commander');
    expect(vm.facts.map(fact => fact.label)).toEqual(['Species']);
  });

  it('lists the facts in the order the Character’s own page uses', () => {
    const vm = buildCharacterPanelVm(
      buildCharacter({
        species: 'Andorian',
        faction: 'Starfleet',
        occupation: 'Executive Officer',
        affiliation: 'Andorian Imperial Guard',
        shipAssignment: 'USS Kumari',
      }),
    );

    expect(vm.facts.map(fact => fact.label)).toEqual([
      'Species',
      'Faction',
      'Occupation',
      'Affiliation',
      'Ship',
    ]);
  });

  // A Character with only a species should show one row, not a column of
  // blank labels.
  it('leaves out what has not been filled in', () => {
    const vm = buildCharacterPanelVm(buildCharacter({ faction: 'Starfleet' }));

    expect(vm.facts).toEqual([
      { label: 'Faction', value: 'Starfleet', icon: 'fa-solid fa-flag' },
    ]);
  });

  it('treats an empty string as nothing recorded', () => {
    const vm = buildCharacterPanelVm(buildCharacter({ rank: '', species: '' }));

    expect(vm.rank).toBeNull();
    expect(vm.facts).toEqual([]);
  });

  it('gives the template a list of traits to walk', () => {
    expect(buildCharacterPanelVm(buildCharacter()).traits).toEqual([]);
    expect(
      buildCharacterPanelVm(buildCharacter({ traits: ['Loyal'] })).traits,
    ).toEqual(['Loyal']);
  });

  describe('whether anything is recorded at all', () => {
    it('is false for a Character with only a name', () => {
      expect(buildCharacterPanelVm(buildCharacter()).hasDetails).toBe(false);
    });

    it.each([
      ['a rank', { rank: 'Commander' }],
      ['a fact', { species: 'Andorian' }],
      ['a bio', { shortBio: 'An Andorian officer.' }],
      ['a trait', { traits: ['Loyal'] }],
    ])('is true for a Character with %s', (_label, overrides) => {
      expect(
        buildCharacterPanelVm(buildCharacter(overrides as Partial<Character>))
          .hasDetails,
      ).toBe(true);
    });
  });
});
