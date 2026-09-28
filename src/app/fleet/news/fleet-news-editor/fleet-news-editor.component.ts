import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';

import { filter, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import {
  FleetArtworkTarget,
  FleetImageService,
} from 'src/app/fleet/fleet-image.service';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { FleetImageCropDialogComponent } from 'src/app/fleet/images/fleet-image-crop-dialog/fleet-image-crop-dialog.component';
import {
  FLEET_NEWS_AUDIENCES,
  FLEET_NEWS_BODY_LIMIT,
  FLEET_NEWS_SUMMARY_LIMIT,
  FLEET_NEWS_TITLE_LIMIT,
  fleetNewsAudienceLabel,
  NEWS_WRITE_CAPABILITY,
} from 'src/app/fleet/news/fleet-news.constants';
import { FleetNewsPageDirective } from 'src/app/fleet/news/fleet-news-page.directive';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetNewsAudience,
  FleetNewsDraft,
  FleetNewsPost,
} from 'src/app/models/fleet-news.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';

/** What to tell somebody who may not write here. */
export const FLEET_NEWS_EDITOR_NOT_PERMITTED =
  'Writing news here is for its news writers, while it is open.';

/** What to say when a save failed for a reason the server did not give. */
export const FLEET_NEWS_SAVE_FAILED =
  'The post could not be saved. Please try again.';

/** What to say when a cover could not be removed. */
export const FLEET_NEWS_COVER_REMOVE_FAILED =
  'The cover could not be removed. Please try again.';

/**
 * Writes a new post of a Community's, a Fleet's or an Armada's news, or
 * changes one (FC-027).
 *
 * For the scope's news writers while it is open; the server checks again.
 * A new post is saved as a draft or published straight away. A cover can be
 * added once the post exists, so saving a new draft opens it here again,
 * where the cover is offered. The body is Markdown, previewed as it will be
 * shown; the site's renderer is used unchanged, so a post cannot carry
 * anything the site's own news cannot.
 */
@Component({
  selector: 'app-fleet-news-editor',
  templateUrl: './fleet-news-editor.component.html',
  styleUrls: ['../fleet-news.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MarkdownPipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetNewsEditorComponent extends FleetNewsPageDirective<FleetNewsPost | null> {
  private readonly _router = inject(Router);
  private readonly _dialog = inject(MatDialog);
  private readonly _images = inject(FleetImageService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly notPermittedMessage = FLEET_NEWS_EDITOR_NOT_PERMITTED;

  readonly audiences = FLEET_NEWS_AUDIENCES;
  readonly titleLimit = FLEET_NEWS_TITLE_LIMIT;
  readonly summaryLimit = FLEET_NEWS_SUMMARY_LIMIT;
  readonly bodyLimit = FLEET_NEWS_BODY_LIMIT;

  readonly title = signal('');
  readonly summary = signal('');
  readonly body = signal('');
  readonly audience = signal<FleetNewsAudience>('PUBLIC');

  /** Whether the body is shown as it will read. */
  readonly previewing = signal(false);

  /** Whether a save is under way. */
  readonly busy = signal(false);

  /** What the last save came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * The post the form was last filled from, so reading it again — after a
   * cover changes — does not throw away what has been typed.
   */
  private _filledFrom: string | null = null;

  /**
   * Whose words these are: a label for each audience, worded for the scope.
   *
   * @param scope - The scope.
   * @param audience - The audience.
   * @returns Who may read the post.
   */
  audienceLabel(scope: GovernanceScopeVm, audience: FleetNewsAudience): string {
    return fleetNewsAudienceLabel(audience, this.kindOf(scope));
  }

  /**
   * Whether the form says all it needs to.
   *
   * @returns True when there is a title and a body.
   */
  canSave(): boolean {
    return (
      !this.busy() && this.title().trim() !== '' && this.body().trim() !== ''
    );
  }

  /**
   * Where Cancel goes: the post, or the news for a new one.
   *
   * @param scope - The scope.
   * @param post - The post, or null for a new one.
   * @returns The router link.
   */
  cancelLinkOf(scope: GovernanceScopeVm, post: FleetNewsPost | null): string[] {
    return post === null
      ? this.newsLinkOf(scope)
      : this.postLinkOf(scope, post);
  }

  /**
   * Saves the post, publishing it too when asked. Pressing Enter in a field
   * submits the form whatever the buttons say, so this checks again.
   *
   * @param scope - The scope.
   * @param post - The post, or null for a new one.
   * @param publish - Whether to publish it as well.
   */
  onSave(
    scope: GovernanceScopeVm,
    post: FleetNewsPost | null,
    publish: boolean,
  ): void {
    if (!this.canSave()) {
      return;
    }

    const draft: FleetNewsDraft = {
      title: this.title().trim(),
      summary: this.summary().trim() === '' ? null : this.summary().trim(),
      body: this.body(),
      audience: this.audience(),
    };

    this.busy.set(true);
    this.error.set(null);
    (post === null
      ? this._news.create(scope.target, draft)
      : this._news.update(scope.target, post.id, draft)
    )
      .pipe(
        switchMap(saved =>
          publish && saved.status === 'DRAFT'
            ? this._news.publish(scope.target, saved.id)
            : of(saved),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: saved => {
          this.busy.set(false);
          // A new draft opens here again, where a cover can be added.
          void this._router.navigate(
            post === null && saved.status === 'DRAFT'
              ? FLEET_LINKS.newsEdit(this.newsLinkOf(scope), saved.slug)
              : this.postLinkOf(scope, saved),
          );
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, FLEET_NEWS_SAVE_FAILED));
        },
      });
  }

  /**
   * Sets or replaces the cover, through the same dialogue a banner uses;
   * the post shows it once the scanner has cleared it.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onSetCover(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.error.set(null);
    this._dialog
      .open(FleetImageCropDialogComponent, {
        data: {
          slot: FleetImageSlot.COVER,
          target: this.coverTargetOf(scope, post),
          scopeName: post.title,
          currentAlt: post.coverImageAlt,
        },
        width: '90vw',
        maxWidth: '1100px',
      })
      .afterClosed()
      .pipe(take(1), filter(Boolean))
      .subscribe(() => this.reload());
  }

  /**
   * Removes the cover, once asked.
   *
   * @param scope - The scope.
   * @param post - The post.
   */
  onRemoveCover(scope: GovernanceScopeVm, post: FleetNewsPost): void {
    this.error.set(null);
    this._confirm
      .askToDestroy({
        title: 'Remove the cover?',
        question: 'Remove this post’s cover?',
        consequence:
          'It is taken down straight away and cannot be put back without ' +
          'uploading it again.',
        confirmText: 'Remove',
      })
      .pipe(
        filter(Boolean),
        switchMap(() =>
          this._images.remove(
            this.coverTargetOf(scope, post),
            FleetImageSlot.COVER,
          ),
        ),
      )
      .subscribe({
        next: () => this.reload(),
        error: () => this.error.set(FLEET_NEWS_COVER_REMOVE_FAILED),
      });
  }

  /**
   * Opens only to the scope's news writers, while it is open.
   *
   * @param scope - The scope.
   * @returns True when they may write here.
   */
  protected override mayOpen(scope: GovernanceScopeVm): boolean {
    return (
      !scope.isClosed && scope.capabilities.includes(NEWS_WRITE_CAPABILITY)
    );
  }

  /**
   * Reads the post being changed, or nothing for a new one, and fills the
   * form from it the first time.
   *
   * @param scope - The scope.
   * @returns The post, or null.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetNewsPost | null> {
    const slug = this._route.snapshot.paramMap.get('postSlug');
    const post$: Observable<FleetNewsPost | null> =
      slug === null
        ? of(null)
        : this._news.read(scope.target, slug).pipe(map(view => view.post));

    return post$.pipe(tap(post => this.fill(post)));
  }

  /**
   * Fills the form from a post, once per post.
   *
   * @param post - The post, or null for a new one.
   */
  private fill(post: FleetNewsPost | null): void {
    const key = post?.id ?? '';

    if (this._filledFrom === key) {
      return;
    }

    this._filledFrom = key;
    this.title.set(post?.title ?? '');
    this.summary.set(post?.summary ?? '');
    this.body.set(post?.body ?? '');
    this.audience.set(post?.audience ?? 'PUBLIC');
    this.previewing.set(false);
    this.error.set(null);
  }

  /**
   * Where a post's cover is sent.
   *
   * @param scope - The scope.
   * @param post - The post.
   * @returns The upload target.
   */
  private coverTargetOf(
    scope: GovernanceScopeVm,
    post: FleetNewsPost,
  ): FleetArtworkTarget {
    return {
      kind: 'NEWS_POST',
      communityId: scope.target.communityId,
      fleetId: scope.target.fleetId,
      armadaId: scope.target.armadaId ?? null,
      postId: post.id,
    };
  }
}
