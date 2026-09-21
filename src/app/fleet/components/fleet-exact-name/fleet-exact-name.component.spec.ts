import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleetExactNameComponent } from './fleet-exact-name.component';

describe('FleetExactNameComponent', () => {
  let fixture: ComponentFixture<FleetExactNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetExactNameComponent],
    }).compileComponents();
  });

  /**
   * Renders the name.
   *
   * @param name - The name exactly as recorded.
   */
  function render(name: string): void {
    fixture = TestBed.createComponent(FleetExactNameComponent);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
  }

  /**
   * The marks drawn for edge spaces.
   *
   * @returns Every space mark, in document order.
   */
  const spaceMarks = (): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.fleet-exact-name__space'),
    );

  /**
   * The text of the core.
   *
   * @returns The core's text content.
   */
  const coreText = (): string =>
    (
      fixture.nativeElement.querySelector(
        '.fleet-exact-name__core',
      ) as HTMLElement
    ).textContent ?? '';

  /**
   * The accessible name the whole thing carries.
   *
   * @returns The aria-label.
   */
  const ariaLabel = (): string | null =>
    (
      fixture.nativeElement.querySelector('.fleet-exact-name') as HTMLElement
    ).getAttribute('aria-label');

  it('should draw a name with no edge spaces as itself', () => {
    render('Alpha Quadrant Alliance');

    expect(coreText()).toBe('Alpha Quadrant Alliance');
    expect(spaceMarks()).toHaveLength(0);
    expect(ariaLabel()).toBe('Alpha Quadrant Alliance');
  });

  it('should mark a single leading space and say so', () => {
    render(' Alpha Quadrant Alliance');

    expect(coreText()).toBe('Alpha Quadrant Alliance');
    expect(spaceMarks()).toHaveLength(1);
    expect(ariaLabel()).toBe('Alpha Quadrant Alliance, with one leading space');
  });

  it('should mark a single trailing space and say so', () => {
    render('Alpha Quadrant Alliance ');

    expect(spaceMarks()).toHaveLength(1);
    expect(ariaLabel()).toBe(
      'Alpha Quadrant Alliance, with one trailing space',
    );
  });

  it('should draw one mark per space and count them in the plural', () => {
    render('   Alpha Quadrant Alliance');

    expect(spaceMarks()).toHaveLength(3);
    expect(ariaLabel()).toBe(
      'Alpha Quadrant Alliance, with three leading spaces',
    );
  });

  it('should say both edges when the name has spaces at each', () => {
    render(' Alpha Quadrant Alliance  ');

    expect(spaceMarks()).toHaveLength(3);
    expect(ariaLabel()).toBe(
      'Alpha Quadrant Alliance, with one leading space and two trailing spaces',
    );
  });

  it('should draw the leading marks before the core and the trailing marks after', () => {
    render(' Alpha ');

    const children = Array.from(
      (fixture.nativeElement.querySelector('.fleet-exact-name') as HTMLElement)
        .children,
    ).map(child => child.className);

    expect(children).toEqual([
      'fleet-exact-name__space',
      'fleet-exact-name__core',
      'fleet-exact-name__space',
    ]);
  });

  it('should hide every drawn part from assistive technology', () => {
    render(' Alpha ');

    const parts = Array.from(
      (fixture.nativeElement.querySelector('.fleet-exact-name') as HTMLElement)
        .children,
    );

    expect(
      parts.every(part => part.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('should keep a run of spaces inside the name in the core, unmarked', () => {
    render('Alpha  Quadrant');

    expect(coreText()).toBe('Alpha  Quadrant');
    expect(spaceMarks()).toHaveLength(0);
    expect(ariaLabel()).toBe('Alpha  Quadrant');
  });

  it('should treat a name that is nothing but spaces as three leading ones', () => {
    render('   ');

    expect(coreText()).toBe('');
    expect(spaceMarks()).toHaveLength(3);
    expect(ariaLabel()).toBe(', with three leading spaces');
  });

  it('should count past five as a numeral', () => {
    render('      Alpha');

    expect(spaceMarks()).toHaveLength(6);
    expect(ariaLabel()).toBe('Alpha, with 6 leading spaces');
  });

  it('should redraw when the name changes', () => {
    render('Alpha');

    fixture.componentRef.setInput('name', 'Alpha ');
    fixture.detectChanges();

    expect(spaceMarks()).toHaveLength(1);
    expect(ariaLabel()).toBe('Alpha, with one trailing space');
  });
});
