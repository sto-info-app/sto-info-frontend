import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

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
  @Input() size: 'default' | 'small' = 'default';

  @HostBinding('style')
  get hostStyle(): Record<string, string> {
    if (this.size === 'small') {
      return {
        '--hero-width': '150px',
        '--hero-height': '130px',
        '--hero-label-size': '0.6rem',
        '--hero-number-size': '1.1rem',
      };
    }
    return {};
  }

  get rankDisplay(): string {
    return this.totalNodes.toString().padStart(4, '0');
  }
}
