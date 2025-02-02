import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-lcars-success-message',
    templateUrl: './lcars-success-message.component.html',
    styleUrls: ['./lcars-success-message.component.scss'],
    standalone: false
})
export class LcarsSuccessMessageComponent {
  @Input() title = 'Incoming message';
  @Input() message = 'Transmission received.';
  @Input() blinkMessage? = false;
}
