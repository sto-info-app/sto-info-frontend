import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  NEWS_CATEGORY_ICONS,
  NEWS_CATEGORY_LABELS,
  NewsPost,
} from 'src/app/models/news.models';
import { APP_ROUTES } from '../../constants/app-routing.constants';
import { RoutingService } from '../../services/routing.service';

@Component({
  selector: 'app-news-card',
  templateUrl: './news-card.component.html',
  styleUrls: ['./news-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class NewsCardComponent {
  @Input({ required: true }) post!: NewsPost;

  categoryLabels = NEWS_CATEGORY_LABELS;
  categoryIcons = NEWS_CATEGORY_ICONS;

  private readonly _routingService = inject(RoutingService);

  getDetailLink(slug: string): string {
    return this._routingService.getLink(`${APP_ROUTES.NEWS}/${slug}`);
  }
}
