import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, of } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import {
  StorytimeComment,
  StorytimeCommentStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { CommentService } from '../../comment.service';

/**
 * How many colours a thread cycles through before starting again.
 *
 * Kept in step with `$storytime-comment-colours` in the stylesheet: a longer
 * thread than this repeats, which is the point at which two of the same colour
 * are far enough apart not to be read as related.
 */
const COMMENT_COLOURS = 6;

/** One comment and the replies to it. */
export interface CommentNode {
  /** The comment. */
  comment: StorytimeComment;
  /** Its replies, oldest first. */
  replies: StorytimeComment[];
}

/** What a silenced comment says in place of its words. */
export const SILENCED_TEXT: Record<StorytimeCommentStatus, string> = {
  [StorytimeCommentStatus.VISIBLE]: '',
  [StorytimeCommentStatus.DELETED_BY_AUTHOR]:
    'This comment was deleted by its author.',
  [StorytimeCommentStatus.HIDDEN_BY_OWNER]:
    'This comment was hidden by the owner of this page.',
  [StorytimeCommentStatus.REMOVED_BY_ADMIN]:
    'This comment was removed by an administrator.',
};

/**
 * The conversation on a Story, Chapter or Arc.
 *
 * Replies go one level deep, so a thread reads top to bottom rather than
 * wandering off to the right. A silenced comment keeps its place and loses its
 * words, and says who silenced it: "removed by an administrator" and "deleted
 * by its author" mean different things to somebody reading a reply to it.
 */
@Component({
  selector: 'app-comment-thread',
  templateUrl: './comment-thread.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CollapsibleSectionComponent,
  ],
})
export class CommentThreadComponent implements OnInit {
  /** Route constants, for the link to a commenter's profile. */
  readonly appRoutes = APP_ROUTES;

  /** What is being commented on. */
  @Input({ required: true }) targetType!: StorytimeTargetType;

  /** The thing being commented on. */
  @Input({ required: true }) targetId!: string;

  /**
   * Whether the reader owns the content the thread is on.
   *
   * Decides whether the hide control is offered. The server decides whether it
   * works; this only decides whether it is worth showing.
   */
  @Input() isOwner = false;

  /** The thread, top-level comments with their replies. */
  nodes: CommentNode[] = [];

  /** Whether the thread is still loading. */
  isLoading = true;

  /** Whether something is in flight. */
  isSaving = false;

  /** What the reader is typing at the foot of the thread. */
  draft = '';

  /** The comment being replied to, if any. */
  replyingTo: string | null = null;

  /** What the reader is typing as a reply. */
  replyDraft = '';

  /** The comment being edited, if any. */
  editingId: string | null = null;

  /** What the reader is typing as an edit. */
  editDraft = '';

  /** The comment an administrator is removing, if any. */
  removingId: string | null = null;

  /** What the administrator is typing as the reason. */
  removeDraft = '';

  /** A message to show when something failed. */
  errorMessage = '';

  /**
   * Whether the reader may remove comments under the content policy.
   *
   * False until the answer arrives, so the control never appears and then
   * vanishes for somebody who does not moderate.
   */
  canModerate = false;

  /** The statuses, so the template does not spell out the enum. */
  readonly statuses = StorytimeCommentStatus;

  private readonly _commentService = inject(CommentService);
  private readonly _authService = inject(AuthService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether the reader may join in.
   *
   * @returns True when somebody is signed in.
   */
  get canComment(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Loads the thread, and asks whether this reader moderates.
   */
  ngOnInit(): void {
    this.load();
    this.loadModeration();
  }

  /**
   * Asks whether the reader may remove comments under the content policy.
   *
   * The permission rather than the administrator role, because that is what
   * the endpoint behind the control checks. Moderating Storytime is a job
   * somebody can be given without the rest of the site coming with it, and
   * reading the role here would offer the control to the wrong people in both
   * directions.
   *
   * Silent when it fails: the control is hidden, and the server refuses the
   * action anyway if the answer was wrong.
   */
  private loadModeration(): void {
    this._accessControlService
      .hasPermission(PERMISSIONS.STORYTIME_MODERATE)
      .pipe(
        catchError(() => of(false)),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(canModerate => {
        this.canModerate = canModerate;
      });
  }

  /**
   * Whether a comment is the reader's own.
   *
   * @param comment - The comment.
   * @returns True when they wrote it.
   */
  isMine(comment: StorytimeComment): boolean {
    return comment.authorUserId === this._authService.getUserId();
  }

  /**
   * The panel colour a comment wears.
   *
   * Taken in turn from the cycle the stylesheet defines, by where the comment
   * sits in the thread — so one comment is told from the next by colour, and a
   * reply takes its parent's because it belongs to it.
   *
   * @param index - The root comment's position in the thread.
   * @returns The class carrying that colour.
   */
  colourFor(index: number): string {
    return `storytime-panel-card--comment-${index % COMMENT_COLOURS}`;
  }

  /**
   * Whether this reader can do anything to a comment.
   *
   * The controls sit in a strip of their own down the side of the panel, and
   * an empty strip is still a strip: a signed-out reader would get a dark band
   * beside every comment offering nothing.
   *
   * @param comment - The comment.
   * @param canReply - Whether this comment is one that can be replied to.
   * @returns True when at least one control applies.
   */
  hasControls(comment: StorytimeComment, canReply = false): boolean {
    const isVisible = comment.status === this.statuses.VISIBLE;
    const isRemoved = comment.status === this.statuses.REMOVED_BY_ADMIN;

    return (
      (this.canComment && canReply && isVisible) ||
      (this.isMine(comment) && isVisible) ||
      ((this.isOwner || this.canModerate) && !isRemoved)
    );
  }

  /**
   * What to show in place of a silenced comment's words.
   *
   * @param comment - The comment.
   * @returns The wording for its status.
   */
  silencedText(comment: StorytimeComment): string {
    return SILENCED_TEXT[comment.status];
  }

  /**
   * Posts what the reader typed at the foot of the thread.
   */
  post(): void {
    const body = this.draft.trim();

    if (!body || this.isSaving) {
      return;
    }

    this.send(
      this._commentService.postComment({
        targetType: this.targetType,
        targetId: this.targetId,
        body,
      }),
      () => (this.draft = ''),
    );
  }

  /**
   * Starts a reply.
   *
   * @param commentId - The comment being replied to.
   */
  startReply(commentId: string): void {
    this.replyingTo = commentId;
    this.replyDraft = '';
  }

  /**
   * Abandons a reply.
   */
  cancelReply(): void {
    this.replyingTo = null;
    this.replyDraft = '';
  }

  /**
   * Posts the reply the reader typed.
   */
  postReply(): void {
    const body = this.replyDraft.trim();

    if (!body || !this.replyingTo || this.isSaving) {
      return;
    }

    this.send(
      this._commentService.postComment({
        targetType: this.targetType,
        targetId: this.targetId,
        body,
        parentCommentId: this.replyingTo,
      }),
      () => this.cancelReply(),
    );
  }

  /**
   * Starts editing one of the reader's own comments.
   *
   * @param comment - The comment.
   */
  startEdit(comment: StorytimeComment): void {
    this.editingId = comment.id;
    this.editDraft = comment.body ?? '';
  }

  /**
   * Abandons an edit.
   */
  cancelEdit(): void {
    this.editingId = null;
    this.editDraft = '';
  }

  /**
   * Saves the edit the reader typed.
   */
  saveEdit(): void {
    const body = this.editDraft.trim();

    if (!body || !this.editingId || this.isSaving) {
      return;
    }

    this.send(this._commentService.updateComment(this.editingId, body), () =>
      this.cancelEdit(),
    );
  }

  /**
   * Takes back one of the reader's own comments.
   *
   * @param comment - The comment.
   */
  deleteOwn(comment: StorytimeComment): void {
    this.send(this._commentService.deleteComment(comment.id));
  }

  /**
   * What the hide control does to this comment, said in words.
   *
   * The control is an icon, so the words live in its title and its accessible
   * name rather than on its face.
   *
   * @param comment - The comment.
   * @returns The label for the control.
   */
  hideLabel(comment: StorytimeComment): string {
    return comment.status === StorytimeCommentStatus.HIDDEN_BY_OWNER
      ? 'Show on my page'
      : 'Hide from my page';
  }

  /**
   * Hides a comment from the reader's own page, or puts it back.
   *
   * @param comment - The comment.
   */
  toggleHidden(comment: StorytimeComment): void {
    this.send(
      comment.status === StorytimeCommentStatus.HIDDEN_BY_OWNER
        ? this._commentService.unhideComment(comment.id)
        : this._commentService.hideComment(comment.id),
    );
  }

  /**
   * Starts removing a comment under the content policy.
   *
   * @param commentId - The comment.
   */
  startRemove(commentId: string): void {
    this.removingId = commentId;
    this.removeDraft = '';
  }

  /**
   * Abandons a removal.
   */
  cancelRemove(): void {
    this.removingId = null;
    this.removeDraft = '';
  }

  /**
   * Removes a comment, telling its author why.
   *
   * The message is typed rather than picked: it is quoted to the author word
   * for word, and a canned reason would say nothing about what they actually
   * wrote.
   */
  confirmRemove(): void {
    const reason = this.removeDraft.trim();

    if (!reason || !this.removingId || this.isSaving) {
      return;
    }

    this.send(this._commentService.removeComment(this.removingId, reason), () =>
      this.cancelRemove(),
    );
  }

  /**
   * Reads the thread and arranges it into replies.
   */
  private load(): void {
    this.isLoading = true;

    this._commentService
      .getComments(this.targetType, this.targetId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: comments => {
          this.nodes = this.arrange(comments);
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'The conversation could not be loaded.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Arranges a flat list of comments into comments and their replies.
   *
   * A reply whose parent is missing is shown as a top-level comment rather
   * than dropped: somebody wrote it, and losing it silently would be worse
   * than showing it out of place.
   *
   * @param comments - The comments, oldest first.
   * @returns The thread.
   */
  private arrange(comments: StorytimeComment[]): CommentNode[] {
    const nodes = new Map<string, CommentNode>();
    const orphans: StorytimeComment[] = [];

    for (const comment of comments) {
      if (!comment.parentCommentId) {
        nodes.set(comment.id, { comment, replies: [] });
      }
    }

    for (const comment of comments) {
      if (!comment.parentCommentId) {
        continue;
      }

      const parent = nodes.get(comment.parentCommentId);

      if (parent) {
        parent.replies.push(comment);
      } else {
        orphans.push(comment);
      }
    }

    return [
      ...nodes.values(),
      ...orphans.map(comment => ({ comment, replies: [] })),
    ];
  }

  /**
   * Runs a change and reloads the thread when it lands.
   *
   * The thread is reloaded rather than patched in place: a comment's status
   * can change what its neighbours are allowed to show, and reading it back is
   * cheaper than keeping a second copy of those rules here.
   *
   * @param change - The change.
   * @param onSuccess - What to reset once it lands.
   */
  private send(
    change: Observable<StorytimeComment>,
    onSuccess: () => void = () => undefined,
  ): void {
    this.isSaving = true;
    this.errorMessage = '';

    change
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.isSaving = false;
          onSuccess();
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That could not be saved. Try again.';
          this.isSaving = false;
        },
      });
  }
}
