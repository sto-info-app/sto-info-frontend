import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackingReorderControlsComponent } from './custom-tracking-reorder-controls.component';

describe('CustomTrackingReorderControlsComponent', () => {
  let fixture: ComponentFixture<CustomTrackingReorderControlsComponent>;
  let component: CustomTrackingReorderControlsComponent;

  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  const build = (
    index: number,
    count: number,
    axis: 'vertical' | 'horizontal' = 'vertical',
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingReorderControlsComponent);
    component = fixture.componentInstance;
    component.itemName = 'Ship collection';
    component.index = index;
    component.count = count;
    component.axis = axis;
    fixture.detectChanges();
  };

  const icons = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button i')).map(
      (icon: unknown) => (icon as HTMLElement).className,
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingReorderControlsComponent],
    }).compileComponents();
  });

  // "Move up" on its own is ambiguous on a page holding four orderable lists,
  // and a screen reader announces the button rather than the row it sits in.
  it('says what each button moves', () => {
    build(1, 3);

    expect(buttons().map(button => button.getAttribute('aria-label'))).toEqual([
      'Move Ship collection up',
      'Move Ship collection down',
    ]);
  });

  // A strip of tabs runs across the page, so an arrow pointing up beside one is
  // asking the reader to translate it.
  it('points along the list where the list runs across the page', () => {
    build(1, 3, 'horizontal');

    expect(buttons().map(button => button.getAttribute('aria-label'))).toEqual([
      'Move Ship collection left',
      'Move Ship collection right',
    ]);
    expect(icons()).toEqual([
      'fa-solid fa-circle-caret-left',
      'fa-solid fa-circle-caret-right',
    ]);
  });

  it('points down the page for a stack of panels', () => {
    build(1, 3);

    expect(icons()).toEqual([
      'fa-solid fa-circle-caret-up',
      'fa-solid fa-circle-caret-down',
    ]);
  });

  it('offers both moves in the middle of a list', () => {
    build(1, 3);

    expect(buttons().map(button => button.disabled)).toEqual([false, false]);
  });

  it('cannot move the first item up', () => {
    build(0, 3);

    expect(component.isFirst).toBe(true);
    expect(buttons()[0].disabled).toBe(true);
    expect(buttons()[1].disabled).toBe(false);
  });

  it('cannot move the last item down', () => {
    build(2, 3);

    expect(component.isLast).toBe(true);
    expect(buttons()[0].disabled).toBe(false);
    expect(buttons()[1].disabled).toBe(true);
  });

  it('has nowhere to move the only item', () => {
    build(0, 1);

    expect(buttons().map(button => button.disabled)).toEqual([true, true]);
  });

  it('asks for a move when a button is pressed', () => {
    build(1, 3);

    const moves: string[] = [];
    component.moveUp.subscribe(() => moves.push('up'));
    component.moveDown.subscribe(() => moves.push('down'));

    buttons()[0].click();
    buttons()[1].click();

    expect(moves).toEqual(['up', 'down']);
  });
});
