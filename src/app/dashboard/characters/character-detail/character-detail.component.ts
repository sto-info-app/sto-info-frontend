import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, Subject, catchError, map, switchMap, takeUntil } from 'rxjs';
import { CharacterRdComponent } from 'src/app/dashboard/character-rd/character-rd.component';
import { CharacterAdmiraltyComponent } from 'src/app/dashboard/character-admiralty/character-admiralty.component';
import { CharacterCommendationsComponent } from 'src/app/dashboard/character-commendations/character-commendations.component';
import { CharacterOverviewSummaryComponent } from 'src/app/dashboard/character-overview/character-overview-summary.component';
import { CharacterReputationsComponent } from 'src/app/dashboard/character-reputations/character-reputations.component';
import { CharacterSpecializationComponent } from 'src/app/dashboard/character-specialization/character-specialization.component';
import { StoSwitcherButtonComponent } from 'src/app/dashboard/switcher/sto-switcher-button.component';
import { CustomTrackingOwnerPanelComponent } from 'src/app/dashboard/custom-tracking/custom-tracking-owner-panel/custom-tracking-owner-panel.component';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterTrackerTab } from 'src/app/dashboard/models/character-overview.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CustomTrackingTargetScope } from 'src/app/models/custom-tracking.models';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { HasUnsavedChanges } from 'src/app/shared/guards/unsaved-changes.guard';
import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_R2_PUBLIC_URL,
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
  SRC_PHOTO_UNAVAILABLE_300PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';
import { CharacterFleetPanelComponent } from 'src/app/fleet/character/character-fleet-panel/character-fleet-panel.component';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { CharacterPicComponent } from '../dialogs/character-pic/character-pic.component';

/** Identifiers for the tabs available on the character detail page. */
export type CharacterTab = 'overview' | CharacterTrackerTab;

/** The sections of the edit page a bar's pen can lead straight to. */
export type CharacterEditSection = 'biography' | 'notes';

@Component({
  selector: 'app-character-detail',
  templateUrl: './character-detail.component.html',
  styleUrls: ['./character-detail.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    CollapsibleSectionComponent,
    MatButtonModule,
    CharacterReputationsComponent,
    CharacterAdmiraltyComponent,
    CharacterCommendationsComponent,
    CharacterOverviewSummaryComponent,
    CharacterRdComponent,
    CharacterSpecializationComponent,
    CustomTrackingOwnerPanelComponent,
    CharacterFleetPanelComponent,
    StoSwitcherButtonComponent,
  ],
})
export class CharacterDetailComponent
  implements OnInit, OnDestroy, HasUnsavedChanges
{
  /** The scope the owner's own tracking is recorded against on this page. */
  readonly characterScope = CustomTrackingTargetScope.CHARACTER;

  /** The tracked-information block, which is the only thing here that edits. */
  @ViewChild(CustomTrackingOwnerPanelComponent)
  customTracking?: CustomTrackingOwnerPanelComponent;

  /** The tracker summaries on the overview, refreshed on each return to it. */
  @ViewChild(CharacterOverviewSummaryComponent)
  overviewSummary?: CharacterOverviewSummaryComponent;

  /**
   * Whether leaving now would lose something.
   *
   * Nothing else on this page holds unsaved work — the captain itself is
   * edited on its own page — so the answer is whatever the tracked-information
   * editor says, and "no" until somebody opens it.
   *
   * @returns True while that editor holds changes nobody has saved.
   */
  hasUnsavedChanges(): boolean {
    return this.customTracking?.hasUnsavedChanges() === true;
  }

  character: Character | null = null;
  accountHandle = '';
  isLoading = true;
  errorMessage = '';
  imageFailed = false;

  /** Tabs shown in the LCARS tab strip. Add new tracking tabs here. */
  readonly tabs: readonly { id: CharacterTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'reputations', label: 'Reputations' },
    { id: 'rd', label: 'R&D' },
    { id: 'specializations', label: 'Specializations' },
    { id: 'admiralty', label: 'Admiralty' },
    { id: 'commendations', label: 'Commendations' },
  ];

  /** Currently selected tab. */
  readonly activeTab = signal<CharacterTab>('overview');

  /**
   * Whether the reputations tab has been opened at least once. Used to lazily
   * mount the reputations component and then keep it alive (hidden) so its data
   * is only fetched once rather than on every tab switch.
   */
  readonly reputationsOpened = signal(false);

  /**
   * Whether the R&D tab has been opened at least once. Used to lazily mount the
   * R&D component and then keep it alive (hidden) so its data is only fetched
   * once rather than on every tab switch.
   */
  readonly rdOpened = signal(false);

  /**
   * Whether the specializations tab has been opened at least once. Used to
   * lazily mount the specialization component and then keep it alive (hidden)
   * so its data is only fetched once rather than on every tab switch.
   */
  readonly specializationsOpened = signal(false);

  /** Whether the Admiralty tab has been opened at least once. */
  readonly admiraltyOpened = signal(false);

  /** Whether the Commendations tab has been opened at least once. */
  readonly commendationsOpened = signal(false);

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _characterService = inject(CharacterService);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _dialog = inject(MatDialog);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /** Whether Fleet Community is on, so the Character's Fleet panel is drawn. */
  readonly isFleetOffered$ = inject(FleetConfigurationService).isOffered();

  public readonly appRoutes = APP_ROUTES;
  public readonly unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  ngOnInit(): void {
    // Keep the active tab in sync with the ?tab= query parameter so tabs are
    // bookmarkable and the browser back/forward buttons work as expected.
    this._route.queryParamMap
      .pipe(takeUntil(this._destroy$))
      .subscribe(queryParams => this.applyTabFromUrl(queryParams.get('tab')));

    this._route.params
      .pipe(
        takeUntil(this._destroy$),
        switchMap(params => {
          this.accountHandle = decodeStoHandle(params['handle']);
          const charHandle = params['characterHandle'];

          if (!this.accountHandle || !charHandle) {
            this.isLoading = false;
            this.errorMessage = 'Invalid character link';
            this._cdr.markForCheck();
            return EMPTY;
          }

          this.isLoading = true;
          this.character = null;
          this.errorMessage = '';

          return this._stoAccountService.getAccounts().pipe(
            map(accounts => ({ accounts, charHandle })),
            catchError(err => {
              this.isLoading = false;
              this.errorMessage = 'Failed to load account';
              console.error(err);
              this._cdr.markForCheck();
              return EMPTY;
            }),
          );
        }),
        switchMap(({ accounts, charHandle }) => {
          const account = accounts.find(a => a.handle === this.accountHandle);
          if (!account) {
            this.isLoading = false;
            this.errorMessage = 'Account not found';
            this._cdr.markForCheck();
            return EMPTY;
          }
          return this._characterService.getCharactersByAccount(account.id).pipe(
            map(characters => ({ characters, charHandle })),
            catchError(err => {
              this.isLoading = false;
              this.errorMessage = 'Failed to load account characters';
              console.error(err);
              this._cdr.markForCheck();
              return EMPTY;
            }),
          );
        }),
        switchMap(({ characters, charHandle }) => {
          const char = characters.find(c => c.handle === charHandle);
          if (!char) {
            this.isLoading = false;
            this.errorMessage = 'Character not found';
            this._cdr.markForCheck();
            return EMPTY;
          }
          return this._characterService.getCharacter(char.id).pipe(
            catchError(err => {
              this.isLoading = false;
              this.errorMessage = 'Failed to load character details';
              console.error(err);
              this._cdr.markForCheck();
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe(fullChar => {
        this.character = fullChar;
        this.isLoading = false;
        this._cdr.markForCheck();
      });
  }

  /**
   * Opens the captain's edit page.
   *
   * A section's pen names that section, and the edit page is asked for it
   * by the id of its field, so the reader lands on the biography or the
   * notes rather than at the top of the form.
   *
   * @param section - The section to land on, or nothing for the top.
   * @returns void
   */
  editCharacter(section?: CharacterEditSection): void {
    if (!this.character) return;
    const commands = [
      '/dashboard/accounts',
      encodeStoHandle(this.accountHandle),
      this.character.handle,
      'edit',
    ];
    if (section) {
      void this._router.navigate(commands, { fragment: `${section}-input` });
      return;
    }
    void this._router.navigate(commands);
  }

  editCharacterPhoto(): void {
    if (!this.character) return;
    const dialogRef = this._dialog.open(CharacterPicComponent, {
      hasBackdrop: true,
      disableClose: true,
      data: { character: this.character },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result && this.character) {
          const characterId = this.character.id;
          this.isLoading = true;
          this.imageFailed = false;
          this._characterService
            .getCharacter(characterId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              next: updated => {
                this.character = updated;
                this.isLoading = false;
                this._cdr.markForCheck();
              },
              error: err => {
                this.isLoading = false;
                this._cdr.markForCheck();
                console.error(err);
              },
            });
        }
      });
  }

  /**
   * Pins or unpins this captain, so that it leads the account's captain list.
   *
   * The reply carries the new pin state, so the header updates without a
   * reload of the captain.
   */
  togglePin(): void {
    const character = this.character;
    if (!character) return;

    const pinned = !character.pinnedAt;

    this._characterService
      .setCharacterPinned(character.id, pinned)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: updated => {
          this.character = { ...character, pinnedAt: updated.pinnedAt ?? null };
          this._cdr.markForCheck();
        },
        error: err => {
          console.error('Failed to update the captain pin:', err);
        },
      });
  }

  onProfileImageError(): void {
    this.imageFailed = true;
  }

  getProfileImageUrl(): string {
    if (this.imageFailed || !this.character) {
      return this.unavailablePhotoSrc;
    }

    if (this.character.profilePicture300) {
      return this.formatImageUrl(this.character.profilePicture300);
    }
    if (this.character.profilePicture) {
      return this.formatImageUrl(this.character.profilePicture);
    }
    return this.unavailablePhotoSrc;
  }

  private formatImageUrl(element: string): string {
    if (element.startsWith('http')) {
      return element;
    }

    // If it starts with 'local/', represent a path in Cloudflare R2
    if (element.startsWith('local/')) {
      return `${CLOUDFLARE_R2_PUBLIC_URL}/${element}`;
    }

    // Otherwise assume it's a Cloudflare Images ID
    return `${BASE_CLOUDFLARE_IMAGES_URL}/${element}/${CLOUDFLARE_VARIANT_SQUARE_300PX_NAME}`;
  }

  getAccountLink(): string[] {
    return ['/dashboard/accounts', encodeStoHandle(this.accountHandle)];
  }

  /**
   * The Endeavour Perks page of the STO Account this Captain belongs to.
   * Endeavours are the account's, not the Captain's, so every Captain on one
   * account leads to the same page.
   *
   * @returns The page's path.
   */
  getEndeavoursLink(): string {
    return (
      '/' +
      APP_ROUTES.STO_ACCOUNT_ENDEAVOURS.replace(
        ':handle',
        encodeStoHandle(this.accountHandle),
      )
    );
  }

  /**
   * Switches the active tab and reflects it in the URL via the ?tab= query
   * parameter so the section can be bookmarked and returned to directly. The
   * default (overview) tab drops the parameter to keep the URL clean.
   *
   * @param tab - The tab to activate.
   * @returns void
   */
  selectTab(tab: CharacterTab): void {
    this.setActiveTab(tab);
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Applies the tab indicated by the URL, falling back to overview when the
   * value is missing or unrecognised.
   *
   * @param tab - The raw ?tab= value from the URL.
   * @returns void
   */
  private applyTabFromUrl(tab: string | null): void {
    const isKnown = this.tabs.some(t => t.id === tab);
    this.setActiveTab(isKnown ? (tab as CharacterTab) : 'overview');
  }

  /**
   * Updates the active tab signal, lazily marking a tracker tab as opened so it
   * is mounted once and then kept alive.
   *
   * @param tab - The tab to activate.
   * @returns void
   */
  private setActiveTab(tab: CharacterTab): void {
    // Any tracker tab visited in between may have moved a figure, so the
    // overview's summaries are fetched again on the way back - and only on
    // the way back, since the URL echo of a tab switch lands here too.
    if (tab === 'overview' && this.activeTab() !== 'overview') {
      this.overviewSummary?.reload();
    }
    if (tab === 'reputations') {
      this.reputationsOpened.set(true);
    }
    if (tab === 'rd') {
      this.rdOpened.set(true);
    }
    if (tab === 'specializations') {
      this.specializationsOpened.set(true);
    }
    if (tab === 'admiralty') {
      this.admiraltyOpened.set(true);
    }
    if (tab === 'commendations') {
      this.commendationsOpened.set(true);
    }
    this.activeTab.set(tab);
    this._cdr.markForCheck();
  }

  getRouteLink(route: string): string {
    return `/${route}`;
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
