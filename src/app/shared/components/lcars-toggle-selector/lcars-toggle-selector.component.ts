import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsToggleBase } from '../lcars-toggle-base.directive';

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
export class LcarsToggleSelectorComponent extends LcarsToggleBase {
  @Input() offLabel = 'OFFLINE';
  @Input() onLabel = 'ACTIVE';

  select(value: boolean): void {
    if (this.disabled || this.checked === value) return;
    this.checked = value;
    this.onChange(this.checked);
    this.onTouched();
  }
}
