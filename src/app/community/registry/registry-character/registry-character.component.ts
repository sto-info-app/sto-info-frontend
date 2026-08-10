import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { decodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { CommunityTabsComponent } from '../../community-tabs/community-tabs.component';
import { RegistryCharacter } from '../../models/registry.models';
import {
  buildRegistryAccountLink,
  buildRegistryProfileLink,
} from '../registry-card.builders';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

/**
 * A registry member's public captain.
 *
 * This is the read-only counterpart to the dashboard's captain page: it shows
 * the overview and biography only, never the owner's private notes or the
 * reputation, R&D and specialization progress tabs.
 */
@Component({
  selector: 'app-registry-character',
  templateUrl: './registry-character.component.html',
  styleUrls: ['./registry-character.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    EntityAvatarComponent,
    CommunityTabsComponent,
  ],
})
export class RegistryCharacterComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);

  username = '';
  accountSlug = '';
  characterSlug = '';
  character: RegistryCharacter | null = null;

  /**
   * Reads all three slugs from the route and loads the captain.
   */
  ngOnInit(): void {
    const params = this._route.snapshot.paramMap;
    this.username = params.get('username') ?? '';
    this.accountSlug = params.get('accountSlug') ?? '';
    this.characterSlug = this.normalizeCharacterSlug(
      params.get('characterSlug') ?? '',
    );

    this.runLoad(
      this._registryService.getCharacter(
        this.username,
        this.accountSlug,
        this.buildCharacterLookupSlug(),
      ),
      character => {
        this.character = character;
        this.applyCharacterMeta(character);
      },
      'Something went wrong loading this captain.',
    );
  }

  /**
   * Accepts legacy `handle@account` links and converts them to handle-only.
   *
   * @param routeValue - The raw route segment.
   * @returns The handle-only route value.
   */
  private normalizeCharacterSlug(routeValue: string): string {
    const suffix = `@${this.accountSlug}`;

    return routeValue.endsWith(suffix)
      ? routeValue.slice(0, -suffix.length)
      : routeValue;
  }

  /**
   * Builds the backend lookup slug for this captain.
   *
   * Routes now carry only the captain handle, while the API currently resolves
   * captains by `handle@account` under the owning account path.
   *
   * @returns The captain slug expected by the API.
   */
  private buildCharacterLookupSlug(): string {
    if (!this.characterSlug || !this.accountSlug) {
      return this.characterSlug;
    }

    return `${this.characterSlug}@${this.accountSlug}`;
  }

  /**
   * Sets the page title and social meta once the captain has loaded.
   *
   * @param character - The loaded captain.
   */
  private applyCharacterMeta(character: RegistryCharacter): void {
    const title = `${character.handle} · ${this.username}`;
    this._pageTitleService.setTitle(title);
    this._seoService.setPageMeta(
      title,
      character.biography ?? this.buildDefaultDescription(character),
      character.profilePicture300 ?? undefined,
    );
  }

  /**
   * Builds a description for a captain with no biography.
   *
   * @param character - The loaded captain.
   * @returns A short description of the captain.
   */
  private buildDefaultDescription(character: RegistryCharacter): string {
    const parts = [
      character.rank?.title,
      character.species?.name,
      character.class?.name,
    ].filter(Boolean);

    return parts.length > 0
      ? `${character.handle} — ${parts.join(', ')}.`
      : `${character.handle} in the Galactic Personnel Registry.`;
  }

  /**
   * The captain's in-character full name, if any part of it is recorded.
   *
   * @returns The joined name, or null when none is set.
   */
  get fullName(): string | null {
    if (!this.character) {
      return null;
    }

    const parts = [
      this.character.firstName,
      this.character.middleName,
      this.character.lastName,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * The captain handle annotated with its owning account handle.
   *
   * @returns `handle@account`, or null before the captain has loaded.
   */
  get captainHandleWithAccount(): string | null {
    if (!this.character) {
      return null;
    }

    const accountHandle = decodeStoHandle(this.accountSlug);
    return accountHandle
      ? `${this.character.handle}@${accountHandle}`
      : this.character.handle;
  }

  /**
   * The link back to the owning account.
   *
   * @returns The account path.
   */
  get accountLink(): string[] {
    return buildRegistryAccountLink(this.username, this.accountSlug);
  }

  /**
   * The link back to the owning member's profile.
   *
   * @returns The profile path.
   */
  get profileLink(): string[] {
    return buildRegistryProfileLink(this.username);
  }
}
