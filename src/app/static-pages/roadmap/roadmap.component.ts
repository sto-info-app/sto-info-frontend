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
import { RoadmapSectionKey } from './roadmap.models';

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

  /**
   * The sections the page shows, in order: Complete always, and a list
   * section only while it has something in it. A section with nothing to say
   * is left out of the page and the side column's links alike, rather than
   * standing as a bar over nothing.
   */
  readonly sections = this.sectionMeta.filter(
    section => section.key === 'complete' || this.itemsOf(section.key).length,
  );

  private readonly _routingService = inject(RoutingService);

  /**
   * The items of one of the list sections.
   *
   * @param key - The section; Complete has entries of its own shape and gives
   *   nothing here.
   * @returns The section's items, in order; none for Complete.
   */
  itemsOf(key: RoadmapSectionKey): string[] {
    switch (key) {
      case 'inProgress':
        return this.inProgress;
      case 'planned':
        return this.planned;
      case 'futureIdeas':
        return this.futureIdeas;
      default:
        return [];
    }
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
