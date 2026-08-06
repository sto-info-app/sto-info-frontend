import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CharacterCardComponent } from 'src/app/shared/components/character-card/character-card.component';
import { CharacterCardVm } from 'src/app/shared/components/character-card/character-card.model';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { CommunityTabsComponent } from '../../community-tabs/community-tabs.component';
import { RegistryAccount } from '../../models/registry.models';
import {
  buildRegistryCharacterCard,
  buildRegistryProfileLink,
} from '../registry-card.builders';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

/**
 * A registry member's public STO account and the captains on it.
 */
@Component({
  selector: 'app-registry-account',
  templateUrl: './registry-account.component.html',
  styleUrls: ['./registry-account.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    CharacterCardComponent,
    CommunityTabsComponent,
  ],
})
export class RegistryAccountComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);

  username = '';
  accountSlug = '';
  account: RegistryAccount | null = null;

  /** Presentation models for the account's public captains. */
  characterCards: CharacterCardVm[] = [];

  /**
   * Reads the username and account slug from the route and loads the account.
   */
  ngOnInit(): void {
    const params = this._route.snapshot.paramMap;
    this.username = params.get('username') ?? '';
    this.accountSlug = params.get('accountSlug') ?? '';

    this.runLoad(
      this._registryService.getAccount(this.username, this.accountSlug),
      account => {
        this.account = account;
        this.characterCards = account.characters.map(character =>
          buildRegistryCharacterCard(
            character,
            this.username,
            this.accountSlug,
          ),
        );
        this.applyAccountMeta(account);
      },
      'Something went wrong loading this account.',
    );
  }

  /**
   * Sets the page title and social meta once the account has loaded.
   *
   * @param account - The loaded account.
   */
  private applyAccountMeta(account: RegistryAccount): void {
    const title = `${account.handle} · ${this.username}`;
    this._pageTitleService.setTitle(title);
    this._seoService.setPageMeta(
      title,
      `${account.handle} has ${account.publicCharacterCount} public captain(s) ` +
        'in the Galactic Personnel Registry.',
      account.accountTypeImageUrl,
    );
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
