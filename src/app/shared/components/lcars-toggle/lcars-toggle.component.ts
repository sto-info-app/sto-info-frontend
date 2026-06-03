import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsToggleBase } from '../lcars-toggle-base.directive';

@Component({
  selector: 'app-lcars-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lcars-toggle.component.html',
  styleUrls: ['./lcars-toggle.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LcarsToggleComponent),
      multi: true,
    },
  ],
})
export class LcarsToggleComponent extends LcarsToggleBase {
  @Input() label = '';
}
