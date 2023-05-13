import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-lcars-information-message',
  templateUrl: './lcars-information-message.component.html',
  styleUrls: ['./lcars-information-message.component.scss'],
})
export class LcarsInformationMessageComponent implements OnInit {
  @Input() title: string = 'Incoming message';
  @Input() message: string = 'Transmission received.';
  @Input() blinkMessage?: boolean = false;

  constructor() {}

  ngOnInit(): void {}
}
