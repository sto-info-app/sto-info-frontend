import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackingReorderControlsComponent } from './custom-tracking-reorder-controls.component';

describe('CustomTrackingReorderControlsComponent', () => {
  let fixture: ComponentFixture<CustomTrackingReorderControlsComponent>;
  let component: CustomTrackingReorderControlsComponent;

  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  const build = (index: number, count: number): void => {
    fixture = TestBed.createComponent(CustomTrackingReorderControlsComponent);
    component = fixture.componentInstance;
    component.itemName = 'Ship collection';
    component.index = index;
    component.count = count;
    fixture.detectChanges();
  };

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

  // The row carries the drag itself, so the handle is an affordance rather
  // than a control — everything it suggests is also on the two buttons.
  it('hides the drag handle from assistive technology', () => {
    build(0, 2);

    const handle: HTMLElement = fixture.nativeElement.querySelector(
      '.custom-tracking-reorder-handle',
    );

    expect(handle.getAttribute('aria-hidden')).toBe('true');
  });
});
