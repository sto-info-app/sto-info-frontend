import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcarsToggleBase } from './lcars-toggle-base.directive';

@Component({
  selector: 'app-test-toggle',
  template: '',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestToggleComponent extends LcarsToggleBase {}

describe('LcarsToggleBase', () => {
  let component: TestToggleComponent;
  let fixture: ComponentFixture<TestToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestToggleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggle()', () => {
    it('should set checked, invoke onChange and onTouched when enabled', () => {
      const onChange = jest.fn();
      const onTouched = jest.fn();
      component.registerOnChange(onChange);
      component.registerOnTouched(onTouched);

      component.toggle();

      expect(component.checked).toBe(true);
      expect(onChange).toHaveBeenCalledWith(true);
      expect(onTouched).toHaveBeenCalled();
    });

    it('should not change state or invoke callbacks when disabled', () => {
      const onChange = jest.fn();
      component.registerOnChange(onChange);
      component.setDisabledState(true);

      component.toggle();

      expect(component.checked).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not throw when called before callbacks are registered', () => {
      expect(() => component.toggle()).not.toThrow();
      expect(component.checked).toBe(true);
    });
  });

  describe('writeValue()', () => {
    it('should coerce a truthy value to true', () => {
      component.writeValue(true);
      expect(component.checked).toBe(true);
    });

    it('should coerce a falsy value to false', () => {
      component.writeValue(false);
      expect(component.checked).toBe(false);
    });
  });

  describe('setDisabledState()', () => {
    it('should set disabled to true', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);
    });

    it('should set disabled to false', () => {
      component.setDisabledState(true);
      component.setDisabledState(false);
      expect(component.disabled).toBe(false);
    });
  });

  describe('registerOnChange()', () => {
    it('should replace the active onChange callback', () => {
      const fn = jest.fn();
      component.registerOnChange(fn);

      component.toggle();

      expect(fn).toHaveBeenCalledWith(true);
    });
  });

  describe('registerOnTouched()', () => {
    it('should replace the active onTouched callback', () => {
      const fn = jest.fn();
      component.registerOnTouched(fn);

      component.toggle();

      expect(fn).toHaveBeenCalled();
    });
  });
});
