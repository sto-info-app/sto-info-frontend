import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/**
 * What a reader sees where removed content used to be.
 *
 * Its own page rather than the not-found page, because the two say different
 * things: one means "there was never anything here", the other "there was, and
 * it was taken down". A reader who followed a link from elsewhere is owed the
 * second answer, and the server says so too — these addresses answer 410
 * rather than 404.
 */
@Component({
  selector: 'app-removed-content',
  templateUrl: './removed-content.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class RemovedContentComponent {
  /** Route constants. */
  readonly appRoutes = APP_ROUTES;
}
