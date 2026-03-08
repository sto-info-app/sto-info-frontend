import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmartChartComponent } from './smart-chart.component';

describe('SmartChartComponent', () => {
  let component: SmartChartComponent;
  let fixture: ComponentFixture<SmartChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate maxCount correctly when data changes', () => {
    component.data = [
      { name: 'A', count: 10 },
      { name: 'B', count: 50 },
      { name: 'C', count: 30 },
    ];
    component.ngOnChanges({
      data: new SimpleChange(null, component.data, true),
    });

    expect(component.maxCount).toBe(50);
  });

  it('should return correct bar width', () => {
    component.maxCount = 100;
    expect(component.getBarWidth(50)).toBe('50%');
    expect(component.getBarWidth(100)).toBe('100%');
    expect(component.getBarWidth(0)).toBe('0%');
  });

  it('should return 0% width if maxCount is 0', () => {
    component.maxCount = 0;
    expect(component.getBarWidth(50)).toBe('0%');
  });

  it('should return correct bar color class', () => {
    expect(component.getBarColorClass(0)).toBe('perano-bar');
    expect(component.getBarColorClass(9)).toBe('sunflower-bar');
    expect(component.getBarColorClass(10)).toBe('perano-bar'); // Loops back
  });

  it('should determine showPie correctly based on threshold', () => {
    component.threshold = 2;
    component.data = [{ name: 'A', count: 1 }];
    expect(component.showPie).toBe(true);

    component.data = [
      { name: 'A', count: 1 },
      { name: 'B', count: 1 },
      { name: 'C', count: 1 },
    ];
    expect(component.showPie).toBe(false);
  });

  it('should respect mode over threshold for showPie', () => {
    component.mode = 'pie';
    component.threshold = 1;
    component.data = [
      { name: 'A', count: 1 },
      { name: 'B', count: 1 },
    ];
    expect(component.showPie).toBe(true);

    component.mode = 'bar';
    component.data = [{ name: 'A', count: 1 }];
    expect(component.showPie).toBe(false);
  });
});
