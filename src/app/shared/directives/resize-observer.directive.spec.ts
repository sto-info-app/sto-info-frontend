import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResizeObserverDirective } from './resize-observer.directive';

@Component({
  template: `
    <div
      style="width: 100px; height: 100px;"
      [appResizeObserver]
      (appResizeObserver)="onResize($event)"></div>
  `,
  imports: [ResizeObserverDirective],
  standalone: true,
})
class TestHostComponent {
  @ViewChild(ResizeObserverDirective) directive!: ResizeObserverDirective;
  onResize = jest.fn();
}

describe('ResizeObserverDirective', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockResizeObserver: jest.Mock;
  let observerCallback: (entries: any[]) => void;

  beforeEach(async () => {
    mockResizeObserver = jest.fn().mockImplementation(callback => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };
    });

    // Mock global ResizeObserver
    global.ResizeObserver = mockResizeObserver as any;

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component.directive).toBeTruthy();
  });

  it('should create ResizeObserver and observe element on init', () => {
    expect(mockResizeObserver).toHaveBeenCalled();
  });

  it('should emit contentRect when resize occurs', () => {
    const mockEntry = {
      contentRect: { width: 200, height: 200 } as DOMRectReadOnly,
    };

    observerCallback([mockEntry]);

    expect(component.onResize).toHaveBeenCalledWith(mockEntry.contentRect);
  });

  it('should disconnect observer on destroy', () => {
    const disconnectSpy = jest.spyOn(
      (component.directive as any).observer,
      'disconnect',
    );
    fixture.destroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
