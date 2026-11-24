import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  NEWS_CATEGORY_ICONS,
  NEWS_CATEGORY_LABELS,
  NewsPost,
} from 'src/app/models/news.models';
import { NewsCover, newsCoverOf } from 'src/app/news/news-cover.constants';
import { APP_ROUTES } from '../../constants/app-routing.constants';
import { RoutingService } from '../../services/routing.service';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

@Component({
  selector: 'app-news-card',
  templateUrl: './news-card.component.html',
  styleUrls: ['./news-card.component.scss'],
  standalone: true,
  imports: [AppDatePipe, CommonModule, RouterModule],
})
export class NewsCardComponent {
  @Input({ required: true }) post!: NewsPost;

  categoryLabels = NEWS_CATEGORY_LABELS;
  categoryIcons = NEWS_CATEGORY_ICONS;

  private readonly _routingService = inject(RoutingService);

  /**
   * The post's cover, card-sized (sc-1447).
   *
   * @returns The cover, or null when it has none.
   */
  get cover(): NewsCover | null {
    return newsCoverOf(this.post, 'card');
  }

  getDetailLink(slug: string): string {
    return this._routingService.getLink(`${APP_ROUTES.NEWS}/${slug}`);
  }
}
