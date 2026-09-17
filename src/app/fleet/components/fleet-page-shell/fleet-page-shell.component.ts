import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

import { FleetShellTab } from './fleet-page-shell.model';

/**
 * The chrome every Fleet page sits in: its tab strip, its heading, the line
 * naming what the page is about, and whichever of loading, failed or ready the
 * page is currently in.
 *
 * Purely presentational. It is told what state to draw and never asks: the
 * page owns the request, the retry and the decision about what an error means,
 * which is the same division the shared cards already follow.
 *
 * Holding the three states here is the point of the component. A dozen Fleet
 * pages each writing their own `@if (isLoading)` is a dozen chances for one of
 * them to show a heading above an empty page while a request is in flight, or
 * to leave a stale list on screen under an error.
 */
@Component({
  selector: 'app-fleet-page-shell',
  templateUrl: './fleet-page-shell.component.html',
  styleUrls: ['./fleet-page-shell.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, LoadingBarComponent, LcarsErrorMessageComponent],
})
export class FleetPageShellComponent {
  /** The page's heading, rendered as its `<h1>`. */
  @Input({ required: true }) heading!: string;

  /**
   * The Community, Fleet or Armada the page is about, shown under the heading.
   *
   * A name rather than an identifier: a reader who has three Fleets open needs
   * to know which one this tab is, and a UUID does not tell them.
   */
  @Input() subject: string | null = null;

  /** The section tabs, or an empty strip when the page has no sections. */
  @Input() tabs: readonly FleetShellTab[] = [];

  /** Names the tab strip for a screen reader moving by landmark. */
  @Input() tabsAriaLabel = 'Fleet sections';

  /** Whether the page's own content is still on its way. */
  @Input() isLoading = false;

  /** What the loading bar says while it is. */
  @Input() loadingText = 'Loading';

  /**
   * The message shown in place of the content when the page could not be
   * built, or null when it could.
   *
   * Rendered as text by `<app-lcars-error-message>`. The warning component is
   * deliberately not used here: it renders its message as HTML, and this input
   * carries server and import text.
   */
  @Input() errorMessage: string | null = null;

  /**
   * Whether the projected content should be drawn.
   *
   * @returns True when the page is neither loading nor failed.
   */
  get showsContent(): boolean {
    return !this.isLoading && this.errorMessage === null;
  }
}
