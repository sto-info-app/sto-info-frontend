import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lcars-error-message',
  templateUrl: './lcars-error-message.component.html',
  styleUrls: ['./lcars-error-message.component.scss'],
})
export class LcarsErrorMessageComponent {
  @Input() title = 'Red Alert';
  @Input() message =
    "There has been a problem. We're not sure what it is, but something will probably be installed on Tuesday!";
  @Input() blinkMessage? = false;
}
