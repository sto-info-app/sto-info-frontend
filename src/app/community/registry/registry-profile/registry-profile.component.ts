import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, take } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccountCardComponent } from 'src/app/shared/components/account-card/account-card.component';
import { AccountCardVm } from 'src/app/shared/components/account-card/account-card.model';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { CommunityService } from '../../community.service';
import { RelationshipStatus } from '../../models/community.models';
import {
  RegistryAccountSummary,
  RegistryProfile,
} from '../../models/registry.models';
import { buildRegistryAccountCard } from '../registry-card.builders';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

/**
 * A registry member's public profile: their identity, the STO accounts they
 * have chosen to show, and — for a signed-in visitor — the friend and block
 * actions available against them.
 */
@Component({
  selector: 'app-registry-profile',
  templateUrl: './registry-profile.component.html',
  styleUrls: ['./registry-profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    EntityAvatarComponent,
    AccountCardComponent,
  ],
})
export class RegistryProfileComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _communityService = inject(CommunityService);
  private readonly _authService = inject(AuthService);
  private readonly _dialog = inject(MatDialog);
  private readonly _route = inject(ActivatedRoute);
  private readonly _routingService = inject(RoutingService);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;
  relationshipStatus = RelationshipStatus;

  username = '';
  profile: RegistryProfile | null = null;

  /** Presentation models for the member's public accounts. */
  accountCards: AccountCardVm[] = [];

  /** Copy shown after a friend or block action succeeds. */
  actionMessage = '';

  /** Copy shown when a friend or block action fails. */
  actionError = '';

  /** Set while an action is in flight, so its buttons can be disabled. */
  isActing = false;

  /**
   * Reads the username from the route and loads the member's profile.
   */
  ngOnInit(): void {
    this.username = this._route.snapshot.paramMap.get('username') ?? '';

    this.loadProfile();
  }

  /**
   * Loads (or reloads) the member's profile.
   *
   * The relationship comes back with the profile, so reloading after an action
   * is what re-derives which buttons the page should now offer.
   */
  private loadProfile(): void {
    this.runLoad(
      this._registryService.getProfile(this.username),
      profile => {
        this.profile = profile;
        this.accountCards = profile.accounts.map(account =>
          this.buildAccountCard(account),
        );
        this.applyProfileMeta(profile);
      },
      'Something went wrong loading this profile.',
    );
  }

  // ----- Friend and block actions -----

  /**
   * Whether the viewer is signed in, and so can act on this member at all.
   *
   * @returns True when signed in.
   */
  get isLoggedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * The viewer's relationship to this member, when the API reported one.
   *
   * @returns The relationship status, or null for an anonymous visitor.
   */
  get relationship(): RelationshipStatus | null {
    return this.profile?.relationship?.status ?? null;
  }

  /**
   * Sends a friend request to this member.
   */
  addFriend(): void {
    this.runAction(
      this._communityService.sendFriendRequest({ username: this.username }),
      `Friend request sent to ${this.username}.`,
      'Something went wrong sending that friend request.',
    );
  }

  /**
   * Withdraws the request the viewer sent this member.
   */
  cancelRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.runAction(
      this._communityService.cancelFriendRequest(friendshipId),
      'Friend request withdrawn.',
      'Something went wrong withdrawing that request.',
    );
  }

  /**
   * Accepts the request this member sent the viewer.
   */
  acceptRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.runAction(
      this._communityService.acceptFriendRequest(friendshipId),
      `You and ${this.username} are now friends.`,
      'Something went wrong accepting that request.',
    );
  }

  /**
   * Declines the request this member sent the viewer.
   */
  declineRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.confirm(
      {
        title: 'Decline Request',
        message: `
          <p>Decline the friend request from
          <strong>${this.username}</strong>?</p>
          <p>They are not told, and they may ask again later.</p>`,
        confirmText: 'Decline',
      },
      () =>
        this.runAction(
          this._communityService.declineFriendRequest(friendshipId),
          'Request declined.',
          'Something went wrong declining that request.',
        ),
    );
  }

  /**
   * Ends the friendship with this member.
   */
  removeFriend(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.confirm(
      {
        title: 'Remove Friend',
        message: `
          <p>Remove <strong>${this.username}</strong> from your friends?</p>
          <p>They are not told, and either of you may ask again later.</p>`,
        confirmText: 'Remove',
      },
      () =>
        this.runAction(
          this._communityService.removeFriend(friendshipId),
          `${this.username} was removed from your friends.`,
          'Something went wrong removing that friend.',
        ),
    );
  }

  /**
   * Blocks this member.
   *
   * The confirmation spells out the two consequences that are not obvious: it
   * ends any friendship, and it hides both records from each other.
   */
  blockMember(): void {
    this.confirm(
      {
        title: 'Block Member',
        message: `
          <p>Block <strong>${this.username}</strong>?</p>
          <p>Any friendship or pending request between you ends, neither of
          you can send the other a request, and you disappear from each
          other's registry records. They are not told.</p>`,
        confirmText: 'Block',
      },
      () =>
        this.runAction(
          this._communityService.blockMember({ username: this.username }),
          `${this.username} was blocked.`,
          'Something went wrong blocking that member.',
        ),
    );
  }

  /**
   * Lifts the viewer's block on this member.
   */
  unblockMember(): void {
    const blockId = this.profile?.relationship?.blockId;
    if (!blockId) {
      return;
    }

    this.confirm(
      {
        title: 'Unblock Member',
        message: `
          <p>Unblock <strong>${this.username}</strong>?</p>
          <p>You will be able to see each other in the registry again, but any
          friendship the block ended is not restored.</p>`,
        confirmText: 'Unblock',
      },
      () =>
        this.runAction(
          this._communityService.unblockMember(blockId),
          `${this.username} was unblocked.`,
          'Something went wrong unblocking that member.',
        ),
    );
  }

  // ----- Helpers -----

  /**
   * Runs an action, then reloads the profile so the buttons reflect the new
   * relationship.
   *
   * @param source - The action to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   */
  private runAction(
    source: Observable<unknown>,
    successMessage: string,
    failureMessage: string,
  ): void {
    this.isActing = true;
    this.actionMessage = '';
    this.actionError = '';

    source.pipe(take(1), observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => {
        this.isActing = false;
        this.actionMessage = successMessage;
        this.loadProfile();
      },
      error: () => {
        this.isActing = false;
        this.actionError = failureMessage;
      },
    });
  }

  /**
   * Opens the LCARS confirmation dialog and runs the action if confirmed.
   *
   * @param data - The dialog copy.
   * @param onConfirm - Invoked when the viewer confirms.
   */
  private confirm(
    data: { title: string; message: string; confirmText: string },
    onConfirm: () => void,
  ): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: { ...data, cancelText: 'Cancel' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  /**
   * Builds the read-only account card for one of this member's accounts.
   *
   * @param account - The public account summary.
   * @returns The card presentation model.
   */
  private buildAccountCard(account: RegistryAccountSummary): AccountCardVm {
    return buildRegistryAccountCard(account, this.username);
  }

  /**
   * Sets the page title and social meta once the member has loaded.
   *
   * @param profile - The loaded member profile.
   */
  private applyProfileMeta(profile: RegistryProfile): void {
    this._pageTitleService.setTitle(profile.username);
    this._seoService.setPageMeta(
      profile.username,
      `${profile.username} in the Galactic Personnel Registry: ` +
        `${profile.publicAccountCount} account(s) and ` +
        `${profile.publicCharacterCount} captain(s).`,
      profile.profilePicture300 ?? undefined,
    );
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
