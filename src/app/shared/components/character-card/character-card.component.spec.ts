import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../../constants/app-image-assets.constants';
import { CharacterCardComponent } from './character-card.component';
import { CharacterCardVm } from './character-card.model';

/**
 * Builds a captain card model with sensible owner-facing defaults.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A captain card presentation model.
 */
function buildVm(overrides: Partial<CharacterCardVm> = {}): CharacterCardVm {
  return {
    id: 'character-1',
    handle: 'Rex',
    level: 65,
    link: ['/dashboard/accounts', 'SteveX~1234', 'Rex'],
    factionClass: 'federation',
    classCategory: 'engineering',
    sexIcon: 'mars',
    imageUrl: 'https://cdn.example.com/char/square100',
    speciesName: 'Trill (joined)',
    rankTitle: 'Fleet Admiral',
    rankIconUrl: 'https://cdn.example.com/rank.png',
    factionName: 'Starfleet (2409)',
    factionIconUrl: 'https://cdn.example.com/faction.png',
    recruitTypeName: 'Standard',
    recruitTypeIconUrl: 'https://cdn.example.com/recruit.png',
    actions: [
      { key: 'edit', icon: 'fas fa-user-pen', title: 'Edit Character' },
      {
        key: 'delete',
        icon: 'fas fa-trash',
        title: 'Delete Character',
        destructive: true,
      },
    ],
    ...overrides,
  };
}

describe('CharacterCardComponent', () => {
  let fixture: ComponentFixture<CharacterCardComponent>;
  let component: CharacterCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Creates the card with the supplied model and runs change detection.
   *
   * @param vm - The card model to render.
   */
  function render(vm: CharacterCardVm): void {
    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', vm);
    fixture.detectChanges();
  }

  it('should render the handle with its level', () => {
    render(buildVm());

    expect(
      fixture.nativeElement.querySelector('.character-name').textContent,
    ).toContain('Rex (Lvl 65)');
  });

  it('should render level zero rather than treating it as unset', () => {
    render(buildVm({ level: 0 }));

    expect(component.headerLabel).toBe('Rex (Lvl 0)');
  });

  it('should omit the level when it is not recorded', () => {
    render(buildVm({ level: null }));

    expect(component.headerLabel).toBe('Rex');
  });

  it('should apply the faction and career theme classes', () => {
    render(buildVm());

    expect(
      fixture.nativeElement
        .querySelector('.character-card')
        .classList.contains('federation'),
    ).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('.character-header-row')
        .classList.contains('engineering'),
    ).toBe(true);
  });

  it('should render the rank, species and lookup icons', () => {
    render(buildVm());

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fleet Admiral');
    expect(text).toContain('Trill (joined)');
    expect(fixture.nativeElement.querySelector('.rank-icon-mini')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.faction-icon-watermark'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.recruit-type-icon'),
    ).toBeTruthy();
  });

  it('should fall back to an unknown rank label', () => {
    render(buildVm({ rankTitle: null, rankIconUrl: null }));

    expect(fixture.nativeElement.textContent).toContain('Unknown Rank');
    expect(fixture.nativeElement.querySelector('.rank-icon-mini')).toBeNull();
  });

  it('should omit lookup icons that are not set', () => {
    render(buildVm({ factionIconUrl: null, recruitTypeIconUrl: null }));

    expect(
      fixture.nativeElement.querySelector('.faction-icon-watermark'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.recruit-type-icon'),
    ).toBeNull();
  });

  it('should render the supplied profile image', () => {
    render(buildVm());

    expect(component.imageSrc).toBe('https://cdn.example.com/char/square100');
  });

  it('should use the placeholder when no image is supplied', () => {
    render(buildVm({ imageUrl: null }));

    expect(component.imageSrc).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
  });

  it('should fall back to the placeholder when the image fails to load', () => {
    render(buildVm());

    fixture.nativeElement
      .querySelector('.character-list-image')
      .dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.hasImageFailed).toBe(true);
    expect(component.imageSrc).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
  });

  it('should reset the failed-image state when vm changes', () => {
    render(buildVm());

    fixture.nativeElement
      .querySelector('.character-list-image')
      .dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(component.hasImageFailed).toBe(true);

    fixture.componentRef.setInput(
      'vm',
      buildVm({ imageUrl: 'https://cdn.example.com/char/recovered' }),
    );
    fixture.detectChanges();

    expect(component.hasImageFailed).toBe(false);
    expect(component.imageSrc).toBe('https://cdn.example.com/char/recovered');
  });

  it('should omit the action column when there are no actions', () => {
    render(buildVm({ actions: [] }));

    expect(
      fixture.nativeElement.querySelector('.character-actions'),
    ).toBeNull();
  });

  it('should mark destructive actions', () => {
    render(buildVm());

    const buttons = fixture.nativeElement.querySelectorAll(
      '.character-actions button',
    );
    expect(buttons[0].classList.contains('delete-icon')).toBe(false);
    expect(buttons[1].classList.contains('delete-icon')).toBe(true);
  });

  it('should emit the action key and stop the click from navigating', () => {
    render(buildVm());
    const emitted: string[] = [];
    component.action.subscribe(key => emitted.push(key));

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopSpy = jest.spyOn(event, 'stopPropagation');
    fixture.nativeElement
      .querySelectorAll('.character-actions button')[0]
      .dispatchEvent(event);

    expect(emitted).toEqual(['edit']);
    expect(stopSpy).toHaveBeenCalled();
  });
});
