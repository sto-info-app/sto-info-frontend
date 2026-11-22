import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { buildRegistryProfileLink } from 'src/app/community/registry/registry-card.builders';
import { FleetPicture } from 'src/app/fleet/fleet-artwork';
import {
  FLEET_NEWS_AUDIENCE_BADGES,
  fleetNewsCoverOf,
} from 'src/app/fleet/news/fleet-news.constants';
import {
  FleetNewsAuthor,
  FleetNewsPostSummary,
} from 'src/app/models/fleet-news.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * One post of a Community's, a Fleet's or an Armada's news, as a card.
 *
 * Laid out as the site's own news cards are: a header bar naming who may read
 * it and when it was published, then the cover, the title, the summary and
 * who posted it, with "Read more" and a chevron leading to the post. A draft's
 * bar is sunflower, so it is not mistaken for something readers can see.
 */
@Component({
  selector: 'app-fleet-news-card',
  templateUrl: './fleet-news-card.component.html',
  styleUrls: ['./fleet-news-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, RouterLink],
})
export class FleetNewsCardComponent {
  /** The post. */
  @Input({ required: true }) post!: FleetNewsPostSummary;

  /** Where the post is read. */
  @Input({ required: true }) link!: string[];

  /**
   * Who may read the post, in a word or two.
   *
   * @returns The badge's words.
   */
  get audienceBadge(): string {
    return FLEET_NEWS_AUDIENCE_BADGES[this.post.audience];
  }

  /**
   * Whether the post is a draft rather than published.
   *
   * @returns True for a draft.
   */
  get isDraft(): boolean {
    return this.post.status === 'DRAFT';
  }

  /**
   * The post's cover at a card's size, where it has one.
   *
   * @returns The picture, or null.
   */
  get cover(): FleetPicture | null {
    return fleetNewsCoverOf(this.post, 'card');
  }

  /**
   * Where its author's registry profile is.
   *
   * @param author - The author.
   * @returns The router link.
   */
  profileLinkOf(author: FleetNewsAuthor): string[] {
    return buildRegistryProfileLink(author.username);
  }
}
