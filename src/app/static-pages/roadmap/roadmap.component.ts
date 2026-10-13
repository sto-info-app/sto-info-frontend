import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  ROADMAP_COMPLETE,
  ROADMAP_FUTURE_IDEAS,
  ROADMAP_IN_PROGRESS,
  ROADMAP_PLANNED,
  ROADMAP_SECTION_META,
} from './roadmap.data';

@Component({
  selector: 'app-roadmap',
  templateUrl: './roadmap.component.html',
  styleUrls: ['./roadmap.component.scss'],
  standalone: true,
  imports: [CommonModule, CollapsibleSectionComponent],
})
export class RoadmapComponent {
  readonly appRoutes = APP_ROUTES;
  readonly sectionMeta = ROADMAP_SECTION_META;

  readonly complete = ROADMAP_COMPLETE;

  readonly inProgress = ROADMAP_IN_PROGRESS;

  readonly planned = ROADMAP_PLANNED;

  readonly futureIdeas = ROADMAP_FUTURE_IDEAS;

  private readonly _routingService = inject(RoutingService);

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
