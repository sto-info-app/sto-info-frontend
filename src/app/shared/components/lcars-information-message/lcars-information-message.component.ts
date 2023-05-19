import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lcars-information-message',
  templateUrl: './lcars-information-message.component.html',
  styleUrls: ['./lcars-information-message.component.scss'],
})
export class LcarsInformationMessageComponent {
  @Input() title = 'Incoming message';
  @Input() message = 'Transmission received.';
  @Input() blinkMessage? = false;
}
