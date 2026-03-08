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

  it('should not recalculate when ngOnChanges fires without data change', () => {
    component.data = [{ name: 'A', count: 42 }];
    component.ngOnChanges({
      data: new SimpleChange(null, component.data, true),
    });
    const prevMax = component.maxCount;

    // Call ngOnChanges with a non-data change — maxCount should not be reset
    component.ngOnChanges({ threshold: new SimpleChange(5, 3, false) });

    expect(component.maxCount).toBe(prevMax);
  });

  it('should not crash when calculateChartData is triggered with null data', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.data = null as any;
    expect(() =>
      component.ngOnChanges({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: new SimpleChange([], null as any, false),
      }),
    ).not.toThrow();
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

  it('should return 0 for totalCount when data is empty', () => {
    component.data = [];
    expect(component.totalCount).toBe(0);
  });

  it('should sum all counts for totalCount', () => {
    component.data = [
      { name: 'A', count: 10 },
      { name: 'B', count: 20 },
      { name: 'C', count: 5 },
    ];
    expect(component.totalCount).toBe(35);
  });

  describe('isDonut', () => {
    it('should be true when mode is "donut"', () => {
      component.mode = 'donut';
      expect(component.isDonut).toBe(true);
    });

    it('should be true when mode is "auto" and showPie is true', () => {
      component.mode = 'auto';
      component.threshold = 5;
      component.data = [{ name: 'A', count: 1 }];
      expect(component.showPie).toBe(true);
      expect(component.isDonut).toBe(true);
    });

    it('should be false when mode is "auto" and showPie is false', () => {
      component.mode = 'auto';
      component.threshold = 1;
      component.data = [
        { name: 'A', count: 1 },
        { name: 'B', count: 1 },
        { name: 'C', count: 1 },
      ];
      expect(component.showPie).toBe(false);
      expect(component.isDonut).toBe(false);
    });

    it('should be false when mode is "pie"', () => {
      component.mode = 'pie';
      expect(component.isDonut).toBe(false);
    });

    it('should be false when mode is "bar"', () => {
      component.mode = 'bar';
      expect(component.isDonut).toBe(false);
    });
  });
});
