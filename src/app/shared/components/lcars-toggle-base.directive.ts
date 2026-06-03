import { ChangeDetectorRef, Directive, Input, inject } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Directive()
export abstract class LcarsToggleBase implements ControlValueAccessor {
  @Input() ariaLabel = '';

  checked = false;
  disabled = false;

  protected readonly cdr = inject(ChangeDetectorRef);
  protected onChange: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked = !!value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
