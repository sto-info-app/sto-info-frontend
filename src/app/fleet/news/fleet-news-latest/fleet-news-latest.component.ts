import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import { FLEET_NEWS_LATEST_COUNT } from 'src/app/fleet/news/fleet-news.constants';
import { FleetNewsService } from 'src/app/fleet/news/fleet-news.service';
import {
  FleetNewsPage,
  FleetNewsPostSummary,
} from 'src/app/models/fleet-news.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** The scope whose latest news is shown. */
export interface FleetNewsLatestVm {
  /** Where the server finds it. */
  readonly target: GovernanceTarget;
  /** Where its news is. */
  readonly newsLink: string[];
}

/**
 * The latest few posts of a Community's own news, on its page (FC-027).
 *
 * A Community page has no tab strip, so this is how a reader finds its
 * News page. The section is always there, even with nothing published, so
 * the way to the news is always the same; its writers are offered a new
 * post from it while the Community is open.
 */
@Component({
  selector: 'app-fleet-news-latest',
  templateUrl: './fleet-news-latest.component.html',
  styleUrls: ['../fleet-news.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, RouterLink],
})
export class FleetNewsLatestComponent {
  private readonly _news = inject(FleetNewsService);
  private readonly _destroyRef = inject(DestroyRef);

  /** The scope. */
  readonly scope = signal<FleetNewsLatestVm | null>(null);

  /** Its latest posts, once read; null before, or when they could not be. */
  readonly page = signal<FleetNewsPage | null>(null);

  @Input({ required: true }) set vm(value: FleetNewsLatestVm) {
    this.scope.set(value);
    this.page.set(null);
    this._news
      .list(value.target, { pageSize: FLEET_NEWS_LATEST_COUNT })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => this.page.set(page),
        // The rest of the page stands without it; the link still works.
        error: () => undefined,
      });
  }

  /**
   * Where a post is.
   *
   * @param vm - The scope.
   * @param post - The post.
   * @returns The router link.
   */
  postLinkOf(vm: FleetNewsLatestVm, post: FleetNewsPostSummary): string[] {
    return FLEET_LINKS.newsPost(vm.newsLink, post.slug);
  }

  /**
   * Where a new post is written.
   *
   * @param vm - The scope.
   * @returns The router link.
   */
  writeLinkOf(vm: FleetNewsLatestVm): string[] {
    return FLEET_LINKS.newsWrite(vm.newsLink);
  }
}
