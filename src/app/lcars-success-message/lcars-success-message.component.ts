import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-lcars-success-message',
  templateUrl: './lcars-success-message.component.html',
  styleUrls: ['./lcars-success-message.component.scss'],
})
export class LcarsSuccessMessageComponent implements OnInit {
  @Input() title: string = 'Incoming message';
  @Input() message: string = 'Transmission received.';
  @Input() blinkMessage?: boolean = false;

  constructor() {}

  ngOnInit(): void {}
}
