import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Observable, of } from 'rxjs';

import {
  FleetActivityFeedComponent,
  FleetActivitySource,
} from 'src/app/fleet/activity/fleet-activity-feed/fleet-activity-feed.component';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';

/**
 * A Community's, a Fleet's or an Armada's activity (FC-029).
 *
 * Resolved as its Manage and News pages are, and open to anybody who may
 * see the scope: which items they are shown is the server's answer, asked
 * afresh each time.
 */
@Component({
  selector: 'app-fleet-activity-page',
  templateUrl: './fleet-activity-page.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetActivityFeedComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
  ],
})
export class FleetActivityPageComponent extends GovernancePageDirective<FleetActivitySource> {
  /** Never shown: anybody who may see the scope may open its activity. */
  readonly notPermittedMessage = '';

  /**
   * Opens to anybody who may see the scope.
   *
   * @returns True.
   */
  protected override mayOpen(): boolean {
    return true;
  }

  /**
   * Names the feed to read.
   *
   * @param scope - The scope.
   * @returns Its feed.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetActivitySource> {
    return of({ kind: 'SCOPE', target: scope.target });
  }
}
