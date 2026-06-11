import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * A reusable stat card component inspired by Pi-Hole dashboard.
 * Features a split layout with value/label on the left and an icon on the right.
 * Supports configurable LCARS colours and an optional CTA button.
 */
@Component({
  selector: 'app-stat-info-card',
  templateUrl: './stat-info-card.component.html',
  styleUrls: ['./stat-info-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class StatInfoCardComponent {
  /** The primary label for the statistic. */
  @Input() label = '';

  /** The value to display (large text). */
  @Input() value: string | number = 0;

  /** The Font Awesome icon class (e.g., 'fas fa-users'). */
  @Input() icon = '';

  /** The LCARS colour class (e.g., 'sunflower', 'perano'). */
  @Input() color = 'sunflower';

  /** Optional size modifier: 'sm' | 'md' | 'lg' | 'xl'. Defaults to fluid width. */
  @Input() size?: 'sm' | 'md' | 'lg' | 'xl';

  /** Optional text for the CTA button at the bottom. */
  @Input() ctaText?: string;

  /** Optional router link for the CTA button. */
  @Input() ctaLink?: string | unknown[];
}
