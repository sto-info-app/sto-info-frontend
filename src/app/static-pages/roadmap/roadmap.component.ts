import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  ROADMAP_COMPLETE,
  ROADMAP_FUTURE_IDEAS,
  ROADMAP_IN_PROGRESS,
  ROADMAP_PLANNED,
  ROADMAP_SECTION_EXPANDED_DEFAULTS,
  ROADMAP_SECTION_META,
} from './roadmap.data';
import { RoadmapSectionKey } from './roadmap.models';

@Component({
  selector: 'app-roadmap',
  templateUrl: './roadmap.component.html',
  styleUrls: ['./roadmap.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class RoadmapComponent {
  readonly appRoutes = APP_ROUTES;
  readonly sectionMeta = ROADMAP_SECTION_META;

  sectionExpanded: Record<RoadmapSectionKey, boolean> = {
    ...ROADMAP_SECTION_EXPANDED_DEFAULTS,
  };

  readonly complete = ROADMAP_COMPLETE;

  readonly inProgress = ROADMAP_IN_PROGRESS;

  readonly planned = ROADMAP_PLANNED;

  readonly futureIdeas = ROADMAP_FUTURE_IDEAS;

  private readonly _routingService = inject(RoutingService);

  toggleSection(section: RoadmapSectionKey): void {
    this.sectionExpanded[section] = !this.sectionExpanded[section];
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
