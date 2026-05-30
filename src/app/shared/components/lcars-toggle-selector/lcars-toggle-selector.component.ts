import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-lcars-toggle-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lcars-toggle-selector.component.html',
  styleUrls: ['./lcars-toggle-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LcarsToggleSelectorComponent),
      multi: true,
    },
  ],
})
export class LcarsToggleSelectorComponent implements ControlValueAccessor {
  @Input() offLabel = 'OFFLINE';
  @Input() onLabel = 'ACTIVE';
  @Input() ariaLabel = '';

  checked = false;
  disabled = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  select(value: boolean): void {
    if (this.disabled || this.checked === value) return;
    this.checked = value;
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
