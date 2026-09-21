import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  signal,
} from '@angular/core';

import { catchError, Observable, of } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { CommunitySubscriptionService } from 'src/app/fleet/community-subscription.service';
import { FLEET_RELATIONSHIP_NOTES } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetFollowVm } from 'src/app/fleet/scope/fleet-scope-page.models';
import { CommunityFollowState } from 'src/app/models/fleet.models';

/**
 * Whether the reader follows the Community a page belongs to, and the
 * control for changing it.
 *
 * Following, applying and belonging are three different things, and the
 * reason they are drawn together here is that a reader who cannot see the
 * difference will assume the cheapest one is the expensive one. The note
 * above the button states the membership standing; the button states the
 * following; neither is inferred from the other, because somebody can be a
 * member who does not follow and a follower who is not a member.
 *
 * Nothing here decides anything. The count and the standing arrive with the
 * page, the server refuses what it refuses, and a refusal is reported as it
 * comes back rather than pre-empted by hiding the control — which would
 * leave somebody wondering whether the site or their account was at fault.
 *
 * A scope with no Community says so instead. A Fleet nobody has registered
 * has nothing to follow, and "no followers" would be the wrong answer to a
 * question nobody can ask yet.
 */
@Component({
  selector: 'app-fleet-follow',
  templateUrl: './fleet-follow.component.html',
  styleUrls: ['./fleet-follow.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class FleetFollowComponent {
  private readonly _subscriptions = inject(CommunitySubscriptionService);
  private readonly _authService = inject(AuthService);

  private _vm!: FleetFollowVm;

  /** Whether the caller follows the Community now. */
  protected following = signal(false);

  /** How many follow it now, or null when there is no Community. */
  protected followerCount = signal<number | null>(null);

  /** Set while a follow or unfollow is in flight. */
  protected busy = signal(false);

  /** What went wrong, where anything did. */
  protected errorMessage = signal<string | null>(null);

  /**
   * What to draw.
   *
   * Seeds the state the control changes. A page resolving to a different
   * record replaces all of it, or a count from the last one would be shown
   * against this one.
   */
  @Input({ required: true }) set vm(value: FleetFollowVm) {
    this._vm = value;
    this.following.set(value.isFollowing);
    this.followerCount.set(value.followerCount);
    this.errorMessage.set(null);
    this.busy.set(false);
  }

  get vm(): FleetFollowVm {
    return this._vm;
  }

  /**
   * Whether anybody is signed in.
   *
   * The only condition this page can check. Whether the server will accept
   * the follow is its own answer.
   *
   * @returns True when there is a caller.
   */
  protected get isSignedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * What the page says about the reader's membership standing, if anything.
   *
   * @returns The sentence, or null when there is nothing worth saying.
   */
  protected get standingNote(): string | null {
    const note = FLEET_RELATIONSHIP_NOTES[this.vm.relationship] ?? null;

    return note === null ? null : note.replace('{scope}', this.vm.scopeNoun);
  }

  /**
   * How the follower count reads.
   *
   * @returns The sentence, or null when there is no Community to count.
   */
  protected get countLabel(): string | null {
    const count = this.followerCount();

    if (count === null) {
      return null;
    }

    return count === 1 ? '1 follower' : `${count} followers`;
  }

  /**
   * Starts or stops following, whichever the reader is not doing.
   */
  protected toggle(): void {
    const communityId = this.vm.communityId;

    if (communityId === null || this.busy()) {
      return;
    }

    const wasFollowing = this.following();

    this.run(
      wasFollowing
        ? this._subscriptions.unfollow(communityId)
        : this._subscriptions.follow(communityId),
      wasFollowing
        ? 'That could not be changed. You are still following.'
        : 'That could not be changed. You are not following yet.',
    );
  }

  /**
   * Sends one change and takes the state back from the answer.
   *
   * The count comes from the server rather than being adjusted here,
   * because it is a fact about everybody and the reader changed only their
   * own part of it.
   *
   * @param work - The request.
   * @param failure - What to say if it does not arrive.
   */
  private run(work: Observable<CommunityFollowState>, failure: string): void {
    this.busy.set(true);
    this.errorMessage.set(null);

    work.pipe(catchError(() => of(null))).subscribe(state => {
      this.busy.set(false);

      if (state === null) {
        this.errorMessage.set(failure);

        return;
      }

      this.following.set(state.isFollowing);
      this.followerCount.set(state.followerCount);
    });
  }
}
