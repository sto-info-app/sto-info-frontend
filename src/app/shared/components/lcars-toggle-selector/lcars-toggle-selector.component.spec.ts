import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsToggleSelectorComponent } from './lcars-toggle-selector.component';

describe('LcarsToggleSelectorComponent', () => {
  let component: LcarsToggleSelectorComponent;
  let fixture: ComponentFixture<LcarsToggleSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsToggleSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsToggleSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select a new value and emit callbacks', () => {
    const onChange = jest.fn();
    const onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.select(true);

    expect(component.checked).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onTouched).toHaveBeenCalled();
  });

  it('should allow select with default callbacks before register calls', () => {
    expect(() => component.select(true)).not.toThrow();
    expect(component.checked).toBe(true);
  });

  it('should no-op when selecting same value', () => {
    const onChange = jest.fn();
    component.checked = true;
    component.registerOnChange(onChange);

    component.select(true);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should no-op when disabled', () => {
    component.setDisabledState(true);
    component.select(true);
    expect(component.checked).toBe(false);
  });

  it('should write value', () => {
    component.writeValue(true);
    expect(component.checked).toBe(true);
  });

  it('should register itself as an NG_VALUE_ACCESSOR', () => {
    const accessors = fixture.debugElement.injector.get(NG_VALUE_ACCESSOR);
    expect(accessors.some(a => a === component)).toBe(true);
  });
});
