import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AlertState } from '../constants/lcars-theme.constants';

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert-panel.component.html',
  styleUrls: ['./alert-panel.component.scss'],
})
export class AlertPanelComponent {
  @Input() state: AlertState = 'red';
  @Input() title = 'ALERT';
  @Input() subtitle = 'CONDITION: RED';
  @Input() ariaLive: 'off' | 'polite' | 'assertive' = 'polite';
  @Input() ariaLabel = '';
}
