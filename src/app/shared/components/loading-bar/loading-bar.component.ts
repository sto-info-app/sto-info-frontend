import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-loading-bar',
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss'],
    standalone: false
})
export class LoadingBarComponent {
  @Input() loadingText = 'Loading';
}
