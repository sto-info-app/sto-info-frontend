import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScopeDuplicateVm } from 'src/app/fleet/register/scope-register.models';

import { ScopeDuplicateWarningComponent } from './scope-duplicate-warning.component';

/**
 * Builds a match to warn about.
 *
 * @param overrides - Fields to override.
 * @returns The row.
 */
function duplicate(
  overrides: Partial<ScopeDuplicateVm> = {},
): ScopeDuplicateVm {
  return {
    id: 'fleet-1',
    name: 'Starfleet Command',
    heldBy: 'United Federation Alliance',
    platform: 'PC',
    freshness: 'Roster last imported 4 March 2015',
    lifecycle: null,
    ...overrides,
  };
}

describe('ScopeDuplicateWarningComponent', () => {
  let fixture: ComponentFixture<ScopeDuplicateWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScopeDuplicateWarningComponent],
    }).compileComponents();
  });

  /**
   * Renders the warning.
   *
   * @param duplicates - The matches, or null while nobody has asked.
   */
  function render(duplicates: ScopeDuplicateVm[] | null): void {
    fixture = TestBed.createComponent(ScopeDuplicateWarningComponent);
    fixture.componentRef.setInput('duplicates', duplicates);
    fixture.componentRef.setInput('scopeLabel', 'Fleet');
    fixture.detectChanges();
  }

  /** The whole text of the warning. */
  const text = (): string => fixture.nativeElement.textContent as string;

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  it('says nothing at all until somebody has asked', () => {
    render(null);

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  // "We looked and there is nothing" and "nobody has looked" are different,
  // and only one of them should reassure anybody.
  it('says so out loud when nothing answers to the name', () => {
    render([]);

    expect(find('.scope-duplicate-warning__none')?.textContent).toContain(
      'Nothing else answers to that name',
    );
  });

  // Shown, never enforced: two Communities may each hold a record for the
  // same in-game Fleet and neither is authoritative.
  it('says the registration can still go ahead', () => {
    render([duplicate()]);

    expect(text()).toContain('You can still register yours');
    expect(text()).toContain("nobody's record of a Fleet");
  });

  it('counts one match in the singular', () => {
    render([duplicate()]);

    expect(text()).toContain('1 record already answers to that name');
  });

  it('counts several in the plural', () => {
    render([duplicate(), duplicate({ id: 'fleet-2' })]);

    expect(text()).toContain('2 records already answer to that name');
  });

  // Whose it is and how current it is: the two things that tell two
  // records of one in-game Fleet apart.
  it('says whose each record is, on which platform, and how current', () => {
    render([duplicate()]);

    expect(find('.scope-duplicate-warning__held')?.textContent).toContain(
      'United Federation Alliance · PC',
    );
    expect(find('.scope-duplicate-warning__freshness')?.textContent).toContain(
      'Roster last imported 4 March 2015',
    );
  });

  // Nothing imports a roster for an Armada, so an empty freshness line
  // would imply there was something to be fresh.
  it('leaves the freshness line off where there is none', () => {
    render([duplicate({ freshness: null })]);

    expect(find('.scope-duplicate-warning__freshness')).toBeNull();
  });

  it('says when a match is not simply operating', () => {
    render([duplicate({ lifecycle: 'This record is closed' })]);

    expect(find('.scope-duplicate-warning__lifecycle')?.textContent).toContain(
      'This record is closed',
    );
  });

  it('says nothing about the state of one that is', () => {
    render([duplicate()]);

    expect(find('.scope-duplicate-warning__lifecycle')).toBeNull();
  });

  // A warning that drew two records identically would be a warning nobody
  // could act on.
  it('draws the edge spaces that tell two records apart', () => {
    render([duplicate({ name: 'Starfleet Command ' })]);

    expect(find('.fleet-exact-name__core')?.textContent).toBe(
      'Starfleet Command',
    );
    expect(
      fixture.nativeElement.querySelectorAll('.fleet-exact-name__space'),
    ).toHaveLength(1);
  });

  it('names the kind of record in its own words', () => {
    fixture = TestBed.createComponent(ScopeDuplicateWarningComponent);
    fixture.componentRef.setInput('duplicates', [duplicate()]);
    fixture.componentRef.setInput('scopeLabel', 'Armada');
    fixture.detectChanges();

    expect(text()).toContain("nobody's record of an Armada");
  });
});
