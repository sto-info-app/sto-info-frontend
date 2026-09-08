import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Character } from 'src/app/models/storytime.models';
import { CharacterPanelVm } from '../../character-panel.utility';
import { StorytimeCastEntryComponent } from './cast-entry.component';

@Component({
  standalone: true,
  imports: [StorytimeCastEntryComponent],
  template: `
    <ol>
      <li
        appStorytimeCastEntry
        [entry]="entry"
        [link]="['/', 'storytime', 'characters', 'shran']">
        <button
          type="button"
          class="cta-icon">
          Edit
        </button>
      </li>
    </ol>
  `,
})
class HostComponent {
  entry!: CharacterPanelVm;
}

describe('StorytimeCastEntryComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Builds a Character.
   *
   * @param overrides - Fields to change.
   * @returns The Character.
   */
  const buildCharacter = (overrides: Partial<Character> = {}): Character =>
    ({
      id: 'character-1',
      slug: 'shran',
      name: 'Thy’lek Shran',
      shortBio: null,
      portraitImageThumbnailUrl: null,
      portraitImageAlt: null,
      traits: null,
      isPrimary: false,
      ...overrides,
    }) as Character;

  /**
   * Builds what the panel shows about a Character.
   *
   * @param overrides - Fields to change.
   * @returns The panel's view of them.
   */
  const buildEntry = (
    overrides: Partial<CharacterPanelVm> = {},
  ): CharacterPanelVm => ({
    character: buildCharacter(),
    rank: null,
    facts: [],
    traits: [],
    hasDetails: false,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  /**
   * Renders the panel for the supplied entry.
   *
   * @param entry - The Character as the panel shows them.
   * @returns The rendered element.
   */
  const render = (entry: CharacterPanelVm): HTMLElement => {
    fixture.componentInstance.entry = entry;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  // The panel is a row in a list of them, so it has to stay a list item and
  // keep the classes the row's layout is written against.
  it('is the list item it was put on', () => {
    const element = render(buildEntry());
    const item = element.querySelector('li');

    expect(item?.className).toBe(
      'storytime-panel-card storytime-panel-card--character',
    );
  });

  it('names the Character and leads to them', () => {
    const element = render(buildEntry());
    const heading = element.querySelector('.storytime-panel-card__heading');

    expect(
      heading?.querySelector('.storytime-panel-card__name')?.textContent,
    ).toContain('Thy’lek Shran');
    expect(heading?.getAttribute('href')).toBe('/storytime/characters/shran');
    expect(heading?.getAttribute('title')).toBe('Thy’lek Shran');
  });

  // Who a Story is mainly about should be readable at a glance, without
  // opening everyone in the list to find out.
  it('marks a Character the Story is mainly about', () => {
    const element = render(
      buildEntry({ character: buildCharacter({ isPrimary: true }) }),
    );

    expect(
      element.querySelector('.storytime-panel-card__badge')?.textContent,
    ).toBe('Main');
  });

  it('shows the portrait with the text that stands in for it', () => {
    const element = render(
      buildEntry({
        character: buildCharacter({
          portraitImageThumbnailUrl: 'https://cdn.test/shran',
          portraitImageAlt: 'An Andorian officer',
        }),
      }),
    );
    const portrait = element.querySelector('.storytime-cast-entry__portrait');

    expect(portrait?.getAttribute('src')).toBe('https://cdn.test/shran');
    expect(portrait?.getAttribute('alt')).toBe('An Andorian officer');
  });

  // A portrait with nothing written about it is decoration, so it is hidden
  // from a reader who is being read the page rather than announced as blank.
  it('leaves an undescribed portrait with empty alternative text', () => {
    const element = render(
      buildEntry({
        character: buildCharacter({
          portraitImageThumbnailUrl: 'https://cdn.test/shran',
        }),
      }),
    );

    expect(
      element
        .querySelector('.storytime-cast-entry__portrait')
        ?.getAttribute('alt'),
    ).toBe('');
  });

  it('shows the rank, the facts, the bio and the traits it is given', () => {
    const element = render(
      buildEntry({
        character: buildCharacter({ shortBio: 'Commands the Kumari.' }),
        rank: 'Commander',
        facts: [
          { label: 'Species', value: 'Andorian', icon: 'fa-solid fa-dna' },
        ],
        traits: ['Blunt'],
        hasDetails: true,
      }),
    );

    expect(
      element.querySelector('.storytime-cast-entry__rank')?.textContent,
    ).toContain('Commander');
    expect(
      element.querySelector('.storytime-cast-entry__fact-label')?.textContent,
    ).toContain('Species');
    expect(
      element.querySelector('.storytime-cast-entry__fact-value')?.textContent,
    ).toContain('Andorian');
    expect([
      ...(element.querySelector('.storytime-cast-entry__facts i')?.classList ??
        []),
    ]).toEqual(expect.arrayContaining(['fa-solid', 'fa-dna']));
    expect(
      element.querySelector('.storytime-cast-entry__bio')?.textContent,
    ).toContain('Commands the Kumari.');
    expect(
      element.querySelector('.storytime-cast-entry__traits li')?.textContent,
    ).toContain('Blunt');
  });

  // A Character with nothing but a name says so, rather than leaving a column
  // of blank labels or an empty panel a reader has to interpret.
  it('says when nothing has been recorded about a Character', () => {
    const element = render(buildEntry());

    expect(
      element.querySelector('.storytime-cast-entry__bio')?.textContent?.trim(),
    ).toBe('Nothing has been recorded about them yet.');
  });

  // Nothing a Character does not have is drawn as an empty frame or a bare
  // row: the portrait, the rank, the facts and the traits are all optional.
  it.each([
    ['no portrait when there is none', '.storytime-cast-entry__portrait'],
    ['no rank when none is recorded', '.storytime-cast-entry__rank'],
    ['no facts when none are recorded', '.storytime-cast-entry__facts'],
    ['no traits when none are recorded', '.storytime-cast-entry__traits'],
  ])('renders %s', (_case, selector) => {
    const element = render(buildEntry());

    expect(element.querySelector(selector)).toBeNull();
  });

  // Only the actions differ between the reader's cast tab and the creator's
  // own list, so the panel takes them from whoever is using it.
  it('places the actions it is given in the controls', () => {
    const element = render(buildEntry());

    expect(
      element.querySelector('.storytime-panel-card__controls .cta-icon')
        ?.textContent,
    ).toContain('Edit');
  });
});
