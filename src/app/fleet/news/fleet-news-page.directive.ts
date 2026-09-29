import { Directive, inject } from '@angular/core';

import { buildRegistryProfileLink } from 'src/app/community/registry/registry-card.builders';
import { FleetPicture } from 'src/app/fleet/fleet-artwork';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import {
  FLEET_NEWS_AUDIENCE_BADGES,
  FleetNewsScopeKind,
} from 'src/app/fleet/news/fleet-news.constants';
import { FleetNewsService } from 'src/app/fleet/news/fleet-news.service';
import {
  FleetNewsAuthor,
  FleetNewsPostSummary,
} from 'src/app/models/fleet-news.models';

/**
 * The half of a news page that is the same for all of them (FC-027).
 *
 * A Community's, a Fleet's and an Armada's news are the same pages at three
 * kinds of address, resolved as their Manage pages are resolved. Unlike a
 * Manage page, anybody who may see the scope may read its news, so each
 * reading page opens to everybody: which posts they are shown is the
 * server's answer.
 */
@Directive()
export abstract class FleetNewsPageDirective<
  T,
> extends GovernancePageDirective<T> {
  protected readonly _news = inject(FleetNewsService);

  /**
   * Where the scope's news is.
   *
   * @param scope - The scope.
   * @returns The router link.
   */
  newsLinkOf(scope: GovernanceScopeVm): string[] {
    return [...scope.scopeLink, 'news'];
  }

  /**
   * Where one of its posts is.
   *
   * @param scope - The scope.
   * @param post - The post.
   * @returns The router link.
   */
  postLinkOf(scope: GovernanceScopeVm, post: FleetNewsPostSummary): string[] {
    return FLEET_LINKS.newsPost(this.newsLinkOf(scope), post.slug);
  }

  /**
   * What kind of scope it is, for the wording of its audiences.
   *
   * @param scope - The scope.
   * @returns Its kind.
   */
  kindOf(scope: GovernanceScopeVm): FleetNewsScopeKind {
    if (scope.isCommunity) {
      return 'COMMUNITY';
    }

    return scope.isArmada ? 'ARMADA' : 'FLEET';
  }

  /**
   * The short badge saying who a post is for.
   *
   * @param post - The post.
   * @returns The badge.
   */
  audienceBadgeOf(post: FleetNewsPostSummary): string {
    return FLEET_NEWS_AUDIENCE_BADGES[post.audience];
  }

  /**
   * Where its author's registry profile is.
   *
   * @param author - The author.
   * @returns The router link.
   */
  profileLinkOf(author: FleetNewsAuthor): string[] {
    return buildRegistryProfileLink(author.username);
  }

  /**
   * A post's cover, where it has one.
   *
   * @param post - The post.
   * @returns The picture, or null.
   */
  coverOf(post: FleetNewsPostSummary): FleetPicture | null {
    if (!post.coverImageUrl) {
      return null;
    }

    return {
      // Signed by the API (FC-040); the browser never builds an address.
      url: post.coverImageUrl,
      // An empty description reads as decoration rather than a gap.
      alt: post.coverImageAlt ?? '',
    };
  }
}
