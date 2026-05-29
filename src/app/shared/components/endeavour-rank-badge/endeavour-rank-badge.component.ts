import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-endeavour-rank-badge',
  templateUrl: './endeavour-rank-badge.component.html',
  styleUrls: ['./endeavour-rank-badge.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class EndeavourRankBadgeComponent {
  @Input() totalNodes = 0;

  get rankDisplay(): string {
    return this.totalNodes.toString().padStart(4, '0');
  }
}
