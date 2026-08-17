import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import {
  ArcMembership,
  ArcMembershipStatus,
  ManagedStory,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ArcService } from '../../arc.service';
import { ARC_MEMBERSHIP_STATUS_LABELS } from '../../storytime.constants';
import { StoryService } from '../../story.service';

/**
 * What is in an Arc, and in what order.
 *
 * A curator invites a Story rather than adding one: everything here except
 * their own work waits on the person who wrote it, which is why an unanswered
 * invitation is shown rather than hidden until it is agreed.
 */
@Component({
  selector: 'app-arc-story-list',
  templateUrl: './arc-story-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ArcStoryListComponent implements OnInit {
  /** Everything in the Arc, agreed or not. */
  memberships: ArcMembership[] = [];

  /** The caller's own Stories, offered as one-click invitations. */
  myStories: ManagedStory[] = [];

  /** The Arc being curated. */
  arcId = '';

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Membership status labels, so a raw enum value is never shown. */
  readonly statusLabels = ARC_MEMBERSHIP_STATUS_LABELS;

  /** Membership states, for deciding which actions to offer. */
  readonly membershipStatus = ArcMembershipStatus;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
  private readonly _storyService = inject(StoryService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  /** The form for inviting a Story by its identifier. */
  readonly form = this._formBuilder.nonNullable.group({
    storyId: ['', Validators.required],
  });

  /**
   * Loads the Arc named in the route, and the caller's own Stories.
   */
  ngOnInit(): void {
    this.arcId = this._route.snapshot.paramMap.get('arcId') ?? '';
    this.load();
    this.loadMyStories();
  }

  /**
   * The Stories that are actually part of the Arc, in reading order.
   *
   * Only these can be reordered: an invitation nobody has answered has no
   * place in the order yet.
   *
   * @returns The agreed memberships.
   */
  get approved(): ArcMembership[] {
    return this.memberships.filter(
      membership =>
        membership.membershipStatus === ArcMembershipStatus.APPROVED,
    );
  }

  /**
   * The memberships still waiting on somebody.
   *
   * @returns The unanswered invitations and requests.
   */
  get pending(): ArcMembership[] {
    return this.memberships.filter(
      membership =>
        membership.membershipStatus === ArcMembershipStatus.INVITED ||
        membership.membershipStatus === ArcMembershipStatus.REQUESTED,
    );
  }

  /**
   * The caller's Stories that are not already in the Arc or invited to it.
   *
   * @returns The Stories worth offering.
   */
  get invitableStories(): ManagedStory[] {
    const taken = new Set(
      this.memberships
        .filter(
          membership =>
            membership.membershipStatus !== ArcMembershipStatus.DECLINED &&
            membership.membershipStatus !== ArcMembershipStatus.REMOVED &&
            membership.membershipStatus !== ArcMembershipStatus.WITHDRAWN,
        )
        .map(membership => membership.storyId),
    );

    return this.myStories.filter(story => !taken.has(story.id));
  }

  /**
   * How a membership should be described.
   *
   * The Story may be missing — it can be unpublished or made private after
   * joining — and saying so beats a blank line the curator cannot act on.
   *
   * @param membership - The membership.
   * @returns The title, or an explanation of why there is none.
   */
  describe(membership: ArcMembership): string {
    return membership.story?.title ?? 'A Story you can no longer see';
  }

  /**
   * Whether a membership is waiting on the curator rather than the writer.
   *
   * @param membership - The membership.
   * @returns True when the Story's owner has asked to join.
   */
  awaitsCurator(membership: ArcMembership): boolean {
    return membership.membershipStatus === ArcMembershipStatus.REQUESTED;
  }

  /**
   * Invites the Story named in the form.
   */
  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.inviteStory(this.form.getRawValue().storyId.trim());
  }

  /**
   * Invites a Story into the Arc.
   *
   * @param storyId - The Story to invite.
   */
  inviteStory(storyId: string): void {
    this.runAction(this._arcService.inviteStory(this.arcId, storyId), () =>
      this.form.reset(),
    );
  }

  /**
   * Agrees to a Story that asked to join.
   *
   * @param membership - The membership.
   */
  approve(membership: ArcMembership): void {
    this.runAction(this._arcService.approveMembership(membership.id));
  }

  /**
   * Turns down a Story that asked to join.
   *
   * @param membership - The membership.
   */
  decline(membership: ArcMembership): void {
    this.runAction(this._arcService.declineMembership(membership.id));
  }

  /**
   * Takes a Story out of the Arc, or withdraws an invitation.
   *
   * @param membership - The membership.
   */
  remove(membership: ArcMembership): void {
    this.runAction(this._arcService.leaveArc(membership.id));
  }

  /**
   * Moves a Story one place earlier in the reading order.
   *
   * @param index - Its current position among the agreed Stories.
   */
  moveUp(index: number): void {
    this.move(index, index - 1);
  }

  /**
   * Moves a Story one place later in the reading order.
   *
   * @param index - Its current position among the agreed Stories.
   */
  moveDown(index: number): void {
    this.move(index, index + 1);
  }

  /**
   * Swaps two Stories in the reading order and saves the result.
   *
   * The whole order is sent rather than the one that moved, because the server
   * settles the positions itself — sending a single index would leave the two
   * sides disagreeing about what the order now is.
   *
   * @param from - The position to move from.
   * @param to - The position to move to.
   */
  private move(from: number, to: number): void {
    const ordered = [...this.approved];

    if (to < 0 || to >= ordered.length) {
      return;
    }

    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

    this.runAction(
      this._arcService.reorderArcStories(
        this.arcId,
        ordered.map(membership => membership.id),
      ),
    );
  }

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   * @param onSuccess - Anything else to do once it succeeds.
   */
  private runAction(action: Observable<unknown>, onSuccess?: () => void): void {
    this.isLoading = true;
    this.errorMessage = '';

    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        onSuccess?.();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'That change could not be saved. Please try again shortly.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads what is in the Arc.
   */
  private load(): void {
    this.isLoading = true;

    this._arcService
      .getArcStories(this.arcId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: memberships => {
          this.memberships = memberships;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 403
              ? 'You do not curate this Arc.'
              : 'This Arc could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Loads the caller's own Stories, so the common case needs no identifier.
   *
   * A failure here is left silent: the identifier field still works, and an
   * error about a convenience would only get in the way of the Arc itself.
   */
  private loadMyStories(): void {
    this._storyService
      .getMyStories()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: stories => {
          this.myStories = stories;
        },
        error: () => {
          this.myStories = [];
        },
      });
  }
}
