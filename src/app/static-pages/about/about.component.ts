import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  standalone: false,
})
export class AboutComponent {
  appTitle = environment.appTitle;
}
