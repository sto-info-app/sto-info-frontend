import { Component } from '@angular/core';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

import { RESOURCE_LINKS } from './resources.data';

@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  standalone: true,
  imports: [CollapsibleSectionComponent],
})
export class ResourcesComponent {
  resourceLinks = RESOURCE_LINKS;
}
