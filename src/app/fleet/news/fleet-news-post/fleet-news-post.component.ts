import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { filter, Observable } from 'rxjs';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { fleetNewsAudienceLabel } from 'src/app/fleet/news/fleet-news.constants';
import { FleetNewsPageDirective } from 'src/app/fleet/news/fleet-news-page.directive';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetNewsPost,
  FleetNewsPostView,
} from 'src/app/models/fleet-news.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when no post the reader may see answers to the address. */
export const FLEET_NEWS_POST_MISSING =
  'No post answers to that address. It may have been deleted or ' +
  'unpublished, or it may not be shown to you.';

/** What to say when a change was refused for a reason the server did not give. */
export const FLEET_NEWS_CHANGE_FAILED =
  'That could not be done. Please try again.';

/**
 * One post of a Community's, a Fleet's or an Armada's news (FC-027).
 *
 * Shown to whoever it is published to, and a draft to the scope's news
 * writers. A writer may edit it, publish or unpublish it and delete it while
 * the scope is open, and delete a draft after it closes. A site
 * administrator who is not a writer there may take it down: unpublish or
 * delete it, whatever the scope's state.
 */
@Component({
  selector: 'app-fleet-news-post',
  templateUrl: './fleet-news-post.component.html',
  styleUrls: ['../fleet-news.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    MarkdownPipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetNewsPostComponent extends FleetNewsPageDirective<FleetNewsPostView> {
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  override readonly missingMessage = FLEET_NEWS_POST_MISSING;

  /** Never shown: anybody the post is published to may open it. */
  readonly notPermittedMessage = '';

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Opens to anybody who may see the scope; the server decides what they
   * see.
   *
   * @returns True.
   */
  protected override mayOpen(): boolean {
    return true;
  }

  /**
   * Who the post is for, in words.
   *
   * @param scope - The scope.
   * @param post - The post.
   * @returns Who may read it.
   */
  audienceOf(scope: GovernanceScopeVm, post: FleetNewsPost): string {
    return fleetNewsAudienceLabel(post.audience, this.kindOf(scope));
  }

  /**
   * Where the post is changed.
   *
   * @param scope - The scope.
   * @param post - The post.
   * @returns The router link.
   */
  editLinkOf(scope: GovernanceScopeVm, post: FleetNewsPost): string[] {
    return FLEET_LINKS.newsEdit(this.newsLinkOf(scope), post.slug);
  }

  /**
   * Whether the reader may take the post down as a site administrator:
   * they administer the site and write no news here.
   *
   * @param scope - The scope.
   * @param view - The post, and what the reader may do.
   * @returns True when they may.
   */
  mayTakeDown(scope: GovernanceScopeVm, view: FleetNewsPostView): boolean {
    return scope.isSiteAdmin && !view.mayWrite;
  }

  /**
   * Publishes the post now.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onPublish(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.run(this._news.publish(scope.target, post.id), () => this.reload());
  }

  /**
   * Takes the post back to a draft, once asked.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onUnpublish(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.confirmThen(
      this._confirm.ask({
        title: 'Unpublish this post?',
        message:
          'It goes back to being a draft, which only this news’s writers ' +
          'can read. Publishing it again dates it afresh.',
        confirmText: 'Unpublish',
        cancelText: 'Cancel',
      }),
      () => this._news.unpublish(scope.target, post.id),
      () => this.reload(),
    );
  }

  /**
   * Deletes the post, once asked, and goes back to the news.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onDelete(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.confirmThen(
      this._confirm.askToDestroy({
        title: 'Delete this post?',
        question: 'Delete this post?',
        subject: post.title,
        consequence: 'It cannot be put back, and its cover is taken down.',
      }),
      () => this._news.remove(scope.target, post.id),
      () => this.backTo(scope),
    );
  }

  /**
   * Unpublishes the post as a site administrator, once asked.
   *
   * @param post - The post.
   */
  onTakeDown(post: FleetNewsPost): void {
    this.confirmThen(
      this._confirm.ask({
        title: 'Unpublish this post?',
        message:
          'As a site administrator, you are taking it back to a draft. Its ' +
          'news writers can still read and change it.',
        confirmText: 'Unpublish',
        cancelText: 'Cancel',
      }),
      () => this._news.unpublishAsSiteAdmin(post.id),
      () => this.reload(),
    );
  }

  /**
   * Deletes the post as a site administrator, once asked.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onAdminDelete(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.confirmThen(
      this._confirm.askToDestroy({
        title: 'Delete this post?',
        question: 'As a site administrator, delete this post?',
        subject: post.title,
        consequence: 'It cannot be put back, and its cover is taken down.',
      }),
      () => this._news.removeAsSiteAdmin(post.id),
      () => this.backTo(scope),
    );
  }

  /**
   * Reads the post the address names.
   *
   * @param scope - The scope.
   * @returns The post, and what the reader may do.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetNewsPostView> {
    this.error.set(null);

    return this._news.read(
      scope.target,
      this._route.snapshot.paramMap.get('postSlug') ?? '',
    );
  }

  /**
   * Asks first, then makes a change.
   *
   * @param asked - The answer to the question.
   * @param change - The change.
   * @param done - What to do once it is made.
   */
  private confirmThen(
    asked: Observable<boolean>,
    change: () => Observable<unknown>,
    done: () => void,
  ): void {
    asked.pipe(filter(Boolean)).subscribe(() => this.run(change(), done));
  }

  /**
   * Makes a change, reporting a refusal.
   *
   * @param change - The change.
   * @param done - What to do once it is made.
   */
  private run(change: Observable<unknown>, done: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    change.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(recruitmentRefusalOf(error, FLEET_NEWS_CHANGE_FAILED));
      },
    });
  }

  /**
   * Goes back to the scope's news.
   *
   * @param scope - The scope.
   */
  private backTo(scope: GovernanceScopeVm): void {
    void this._router.navigate(this.newsLinkOf(scope));
  }
}
