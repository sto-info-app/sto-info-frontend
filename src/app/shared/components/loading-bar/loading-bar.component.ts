import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-bar',
  templateUrl: './loading-bar.component.html',
  styleUrls: ['./loading-bar.component.scss'],
  standalone: true,
  imports: [],
})
export class LoadingBarComponent {
  @Input() loadingText = 'Loading';
}
