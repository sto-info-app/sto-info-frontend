import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LcarsToggleBase } from '../lcars-toggle-base.directive';

@Component({
  selector: 'app-lcars-toggle-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lcars-toggle-pill.component.html',
  styleUrls: ['./lcars-toggle-pill.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LcarsTogglePillComponent),
      multi: true,
    },
  ],
})
export class LcarsTogglePillComponent extends LcarsToggleBase {
  @Input() label = '';
}
