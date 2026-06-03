import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsToggleComponent } from './lcars-toggle.component';

describe('LcarsToggleComponent', () => {
  let component: LcarsToggleComponent;
  let fixture: ComponentFixture<LcarsToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsToggleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle and emit change/touched when enabled', () => {
    const onChange = jest.fn();
    const onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.toggle();

    expect(component.checked).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onTouched).toHaveBeenCalled();
  });

  it('should allow toggle with default callbacks before register calls', () => {
    expect(() => component.toggle()).not.toThrow();
    expect(component.checked).toBe(true);
  });

  it('should not toggle when disabled', () => {
    const onChange = jest.fn();
    component.registerOnChange(onChange);
    component.setDisabledState(true);

    component.toggle();

    expect(component.checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should write value and coerce to boolean', () => {
    component.writeValue(true);
    expect(component.checked).toBe(true);

    component.writeValue(false);
    expect(component.checked).toBe(false);
  });

  it('should register itself as an NG_VALUE_ACCESSOR', () => {
    const accessors = fixture.debugElement.injector.get(NG_VALUE_ACCESSOR);
    expect(accessors.some(a => a === component)).toBe(true);
  });
});
