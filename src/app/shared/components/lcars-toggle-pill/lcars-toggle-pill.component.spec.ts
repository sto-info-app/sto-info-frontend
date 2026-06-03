import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsTogglePillComponent } from './lcars-toggle-pill.component';

describe('LcarsTogglePillComponent', () => {
  let component: LcarsTogglePillComponent;
  let fixture: ComponentFixture<LcarsTogglePillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsTogglePillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsTogglePillComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle and emit callbacks', () => {
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

  it('should ignore toggle when disabled', () => {
    component.setDisabledState(true);
    component.toggle();
    expect(component.checked).toBe(false);
  });

  it('should apply writeValue', () => {
    component.writeValue(true);
    expect(component.checked).toBe(true);
  });

  it('should register itself as an NG_VALUE_ACCESSOR', () => {
    const accessors = fixture.debugElement.injector.get(NG_VALUE_ACCESSOR);
    expect(accessors.some(a => a === component)).toBe(true);
  });
});
