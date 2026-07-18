import { Component } from '@angular/core';

import { RESOURCE_LINKS } from './resources.data';

@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  standalone: true,
})
export class ResourcesComponent {
  resourceLinks = RESOURCE_LINKS;
}
