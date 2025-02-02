import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-terms-of-use',
    templateUrl: './terms-of-use.component.html',
    styleUrls: ['./terms-of-use.component.scss'],
    standalone: false
})
export class TermsOfUseComponent {
  appTitle = environment.appTitle;
}
