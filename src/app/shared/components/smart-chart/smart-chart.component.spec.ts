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
    fixture.componentRef.setInput('data', [
      { name: 'A', count: 10 },
      { name: 'B', count: 50 },
      { name: 'C', count: 30 },
    ]);

    expect(component.maxCount()).toBe(50);
  });

  it('should recompute maxCount when data is replaced', () => {
    fixture.componentRef.setInput('data', [{ name: 'A', count: 42 }]);
    expect(component.maxCount()).toBe(42);

    fixture.componentRef.setInput('data', [{ name: 'A', count: 10 }]);
    expect(component.maxCount()).toBe(10);
  });

  it('should not crash when data is null', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fixture.componentRef.setInput('data', null as any),
    ).not.toThrow();
    expect(component.barRows()).toEqual([]);
    expect(component.pieSegments()).toEqual([]);
  });

  it('should return correct bar width', () => {
    fixture.componentRef.setInput('data', [{ name: 'A', count: 100 }]);
    expect(component.getBarWidth(50)).toBe('50%');
    expect(component.getBarWidth(100)).toBe('100%');
    expect(component.getBarWidth(0)).toBe('0%');
  });

  it('should return 0% width if maxCount is 0', () => {
    // default data is [] so maxCount() === 0
    expect(component.getBarWidth(50)).toBe('0%');
  });

  it('should return correct bar color class', () => {
    expect(component.getBarColorClass(0)).toBe('perano-bar');
    expect(component.getBarColorClass(9)).toBe('sunflower-bar');
    expect(component.getBarColorClass(10)).toBe('perano-bar'); // loops back
  });

  it('should determine showPie correctly based on threshold', () => {
    fixture.componentRef.setInput('threshold', 2);
    fixture.componentRef.setInput('data', [{ name: 'A', count: 1 }]);
    expect(component.showPie()).toBe(true);

    fixture.componentRef.setInput('data', [
      { name: 'A', count: 1 },
      { name: 'B', count: 1 },
      { name: 'C', count: 1 },
    ]);
    expect(component.showPie()).toBe(false);
  });

  it('should respect mode over threshold for showPie', () => {
    fixture.componentRef.setInput('mode', 'pie');
    fixture.componentRef.setInput('threshold', 1);
    fixture.componentRef.setInput('data', [
      { name: 'A', count: 1 },
      { name: 'B', count: 1 },
    ]);
    expect(component.showPie()).toBe(true);

    fixture.componentRef.setInput('mode', 'bar');
    fixture.componentRef.setInput('data', [{ name: 'A', count: 1 }]);
    expect(component.showPie()).toBe(false);
  });

  it('should return 0 for totalCount when data is empty', () => {
    expect(component.totalCount()).toBe(0);
  });

  it('should sum all counts for totalCount', () => {
    fixture.componentRef.setInput('data', [
      { name: 'A', count: 10 },
      { name: 'B', count: 20 },
      { name: 'C', count: 5 },
    ]);
    expect(component.totalCount()).toBe(35);
  });

  it('should compute barRows with precomputed width and colorClass', () => {
    fixture.componentRef.setInput('data', [
      { name: 'Alpha', count: 100 },
      { name: 'Beta', count: 50 },
    ]);
    const rows = component.barRows();
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual({
      name: 'Alpha',
      count: 100,
      width: '100%',
      colorClass: 'perano-bar',
    });
    expect(rows[1]).toEqual({
      name: 'Beta',
      count: 50,
      width: '50%',
      colorClass: 'bluey-bar',
    });
  });

  it('should return empty barRows when data is empty', () => {
    expect(component.barRows()).toEqual([]);
  });

  it('should compute pieSegments from data', () => {
    // 3:1 split to cover both large-arc-flag branches (75% > 50% and 25% <= 50%)
    fixture.componentRef.setInput('data', [
      { name: 'Alpha', count: 3 },
      { name: 'Beta', count: 1 },
    ]);
    const segments = component.pieSegments();
    expect(segments.length).toBe(2);
    expect(segments[0].name).toBe('Alpha');
    expect(segments[0].count).toBe(3);
    expect(segments[0].percentage).toBe(75);
    expect(segments[0].color).toBe('#99ccff');
    expect(segments[1].name).toBe('Beta');
    expect(segments[1].percentage).toBe(25);
    expect(segments[1].color).toBe('#7788ff');
  });

  it('should return empty pieSegments when data is empty', () => {
    expect(component.pieSegments()).toEqual([]);
  });

  describe('isDonut', () => {
    it('should be true when mode is "donut"', () => {
      fixture.componentRef.setInput('mode', 'donut');
      expect(component.isDonut()).toBe(true);
    });

    it('should be true when mode is "auto" and showPie is true', () => {
      fixture.componentRef.setInput('mode', 'auto');
      fixture.componentRef.setInput('threshold', 5);
      fixture.componentRef.setInput('data', [{ name: 'A', count: 1 }]);
      expect(component.showPie()).toBe(true);
      expect(component.isDonut()).toBe(true);
    });

    it('should be false when mode is "auto" and showPie is false', () => {
      fixture.componentRef.setInput('mode', 'auto');
      fixture.componentRef.setInput('threshold', 1);
      fixture.componentRef.setInput('data', [
        { name: 'A', count: 1 },
        { name: 'B', count: 1 },
        { name: 'C', count: 1 },
      ]);
      expect(component.showPie()).toBe(false);
      expect(component.isDonut()).toBe(false);
    });

    it('should be false when mode is "pie"', () => {
      fixture.componentRef.setInput('mode', 'pie');
      expect(component.isDonut()).toBe(false);
    });

    it('should be false when mode is "bar"', () => {
      fixture.componentRef.setInput('mode', 'bar');
      expect(component.isDonut()).toBe(false);
    });
  });
});
