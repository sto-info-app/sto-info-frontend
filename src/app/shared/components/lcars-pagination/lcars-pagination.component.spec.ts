import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsPaginationComponent } from './lcars-pagination.component';

describe('LcarsPaginationComponent', () => {
  let fixture: ComponentFixture<LcarsPaginationComponent>;
  let turns: (-1 | 1)[];

  /**
   * Shows the pager on a page.
   *
   * @param page - The page shown.
   * @param pageCount - How many there are.
   * @param labels - The buttons' words, when not the defaults.
   */
  const show = (
    page: number,
    pageCount: number,
    labels: { previousLabel?: string; nextLabel?: string } = {},
  ): void => {
    fixture = TestBed.createComponent(LcarsPaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageCount', pageCount);
    Object.entries(labels).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    turns = [];
    fixture.componentInstance.turn.subscribe(step => turns.push(step));
    fixture.detectChanges();
  };

  /** @returns The pager's two buttons, back then on. */
  const buttons = (): HTMLButtonElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LcarsPaginationComponent] });
  });

  it('says which page this is of how many, with the default words', () => {
    show(2, 5);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Page 2 of 5');
    expect(buttons().map(button => button.textContent?.trim())).toEqual([
      'Previous',
      'Next',
    ]);
  });

  it('uses the words it is given', () => {
    show(2, 5, { previousLabel: 'Newer', nextLabel: 'Older' });

    expect(buttons().map(button => button.textContent?.trim())).toEqual([
      'Newer',
      'Older',
    ]);
  });

  it('asks for the page before or after the one shown', () => {
    show(2, 5);

    buttons()[0].click();
    buttons()[1].click();

    expect(turns).toEqual([-1, 1]);
  });

  it('offers no page before the first or after the last', () => {
    show(1, 1);

    expect(buttons().map(button => button.disabled)).toEqual([true, true]);
  });
});
