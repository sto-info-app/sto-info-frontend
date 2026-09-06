import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingReorderRequest,
  CustomTrackingReorderableDirective,
} from './custom-tracking-reorderable.directive';

/** Two lists side by side, which is the situation the directive exists for. */
@Component({
  selector: 'app-reorderable-host',
  standalone: true,
  imports: [CustomTrackingReorderableDirective],
  template: `
    <ul>
      @for (item of first; track item; let index = $index) {
        <li
          class="first"
          appCustomTrackingReorderable
          reorderList="first"
          [reorderIndex]="index"
          (reordered)="requests.push($event)">
          {{ item }}
        </li>
      }
    </ul>
    <ul>
      @for (item of second; track item; let index = $index) {
        <li
          class="second"
          appCustomTrackingReorderable
          reorderList="second"
          [reorderIndex]="index"
          (reordered)="requests.push($event)">
          {{ item }}
        </li>
      }
    </ul>
  `,
})
class ReorderableHostComponent {
  first = ['a', 'b', 'c'];
  second = ['x', 'y'];
  requests: CustomTrackingReorderRequest[] = [];
}

describe('CustomTrackingReorderableDirective', () => {
  let fixture: ComponentFixture<ReorderableHostComponent>;
  let host: ReorderableHostComponent;

  const rows = (list: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`li.${list}`));

  const transfer = (): DataTransfer =>
    ({
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: jest.fn(),
    }) as unknown as DataTransfer;

  const drag = (
    element: HTMLElement,
    type: string,
    dataTransfer: DataTransfer | null = null,
  ): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    element.dispatchEvent(event);

    return event;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReorderableHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReorderableHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks every row draggable', () => {
    expect(
      rows('first').every(row => row.getAttribute('draggable') === 'true'),
    ).toBe(true);
  });

  it('reports where a row was dragged from and dropped', () => {
    drag(rows('first')[2], 'dragstart');
    drag(rows('first')[0], 'drop');

    expect(host.requests).toEqual([{ from: 2, to: 0 }]);
  });

  it('marks the row being dragged, and unmarks it afterwards', () => {
    drag(rows('first')[1], 'dragstart');
    fixture.detectChanges();

    expect(rows('first')[1].classList).toContain('custom-tracking-dragging');

    drag(rows('first')[1], 'dragend');
    fixture.detectChanges();

    expect(rows('first')[1].classList).not.toContain(
      'custom-tracking-dragging',
    );
  });

  // A tab has no meaning inside a different section, and the server would
  // refuse the order anyway. Refusing here stops the row appearing to move and
  // then springing back.
  it('refuses a drop into a different list', () => {
    drag(rows('first')[0], 'dragstart');

    const over = drag(rows('second')[1], 'dragover');
    drag(rows('second')[1], 'drop');

    expect(over.defaultPrevented).toBe(false);
    expect(host.requests).toEqual([]);
  });

  // Without this the browser refuses the drop, whatever the page thinks.
  it('marks a row in the same list as a valid drop target', () => {
    drag(rows('first')[0], 'dragstart');

    const over = drag(rows('first')[2], 'dragover');

    expect(over.defaultPrevented).toBe(true);
  });

  it('asks for nothing when a row is dropped where it already was', () => {
    drag(rows('first')[1], 'dragstart');
    drag(rows('first')[1], 'drop');

    expect(host.requests).toEqual([]);
  });

  it('asks for nothing when nothing was being dragged', () => {
    drag(rows('first')[1], 'drop');

    expect(host.requests).toEqual([]);
  });

  // Firefox starts no drag at all unless something is carried, even where
  // nothing reads it back.
  it('carries the row it started from', () => {
    const dataTransfer = transfer();

    drag(rows('first')[2], 'dragstart', dataTransfer);

    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '2');
  });

  it('shows a move rather than a copy while dragging over its own list', () => {
    const dataTransfer = transfer();

    drag(rows('first')[0], 'dragstart');
    drag(rows('first')[2], 'dragover', dataTransfer);

    expect(dataTransfer.dropEffect).toBe('move');
  });
});
