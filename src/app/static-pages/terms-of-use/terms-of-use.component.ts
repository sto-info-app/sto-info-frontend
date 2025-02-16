import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-terms-of-use',
  templateUrl: './terms-of-use.component.html',
  standalone: false,
})
export class TermsOfUseComponent {
  appTitle = environment.appTitle;
}
