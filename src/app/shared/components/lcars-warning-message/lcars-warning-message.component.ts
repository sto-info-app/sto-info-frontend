import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lcars-warning-message',
  templateUrl: './lcars-warning-message.component.html',
  styleUrls: ['./lcars-warning-message.component.scss'],
})
export class LcarsWarningMessageComponent {
  @Input() title = 'Yellow Alert';
  @Input() message = 'Warning, Janeway is out of coffee!';
  @Input() blinkMessage? = false;
}
