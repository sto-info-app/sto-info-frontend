import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  appTitle = environment.appTitle;
  appVersion = environment.version;
  currentYear: number;

  constructor() {
    this.currentYear = new Date().getFullYear();
  }
}
