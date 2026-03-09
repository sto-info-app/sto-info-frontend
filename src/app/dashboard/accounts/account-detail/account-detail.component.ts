import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_R2_PUBLIC_URL,
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
  SRC_PHOTO_UNAVAILABLE_100PX,
} from 'src/app/shared/constants/app-image-assets.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';
import { AccountDialogComponent } from '../dialogs/account-dialog/account-dialog.component';

@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    MatButtonModule,
    MatDialogModule,
  ],
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  account: StoAccount | null = null;
  characters: Character[] = [];
  isLoading = true;
  errorMessage = '';
  failedImageIds: Set<string> = new Set();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stoAccountService = inject(StoAccountService);
  private readonly characterService = inject(CharacterService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy$ = new Subject<void>();

  public readonly appRoutes = APP_ROUTES;
  public readonly unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_100PX;

  /** Filter: free-text search. */
  searchText = '';
  /** Filter: rank title. */
  filterRank = '';
  /** Filter: species name. */
  filterSpecies = '';
  /** Filter: faction name. */
  filterFaction = '';
  /** Filter: general faction name. */
  filterGeneralFaction = '';
  /** Filter: sex name. */
  filterSex = '';
  /** Filter: class name. */
  filterClass = '';
  /** Filter: recruit type name. */
  filterRecruitType = '';

  /** Whether the filter section is collapsed. */
  filtersCollapsed = false;

  /**
   * Returns the characters that match all active filters.
   *
   */
  get filteredCharacters(): Character[] {
    return this.characters.filter(c => this.characterMatchesFilters(c));
  }

  private characterMatchesFilters(c: Character): boolean {
    if (this.searchText && !this.matchesSearch(c)) return false;

    return (
      [
        [this.filterRank, c.rank?.levelRange],
        [this.filterSpecies, c.species?.name],
        [this.filterFaction, c.faction?.name],
        [this.filterGeneralFaction, c.generalFaction?.name],
        [this.filterSex, c.sex?.name],
        [this.filterClass, c.class?.name],
        [this.filterRecruitType, c.recruitType?.name],
      ] as [string, string | undefined][]
    ).every(([filter, value]) => !filter || value === filter);
  }

  private matchesSearch(c: Character): boolean {
    const term = this.searchText.toLowerCase();
    return [c.handle, c.firstName, c.lastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term);
  }

  /**
   * Returns the number of currently active filters.
   *
   */
  get activeFilterCount(): number {
    let count = 0;
    if (this.searchText) count++;
    if (this.filterRank) count++;
    if (this.filterSpecies) count++;
    if (this.filterFaction) count++;
    if (this.filterGeneralFaction) count++;
    if (this.filterSex) count++;
    if (this.filterClass) count++;
    if (this.filterRecruitType) count++;
    return count;
  }

  /** Unique rank level ranges from the current character list. */
  get uniqueRanks(): string[] {
    return [
      ...new Set(
        this.characters
          .map(c => c.rank?.levelRange)
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique species names from the current character list. */
  get uniqueSpecies(): string[] {
    return [
      ...new Set(
        this.characters.map(c => c.species?.name).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique faction names from the current character list. */
  get uniqueFactions(): string[] {
    return [
      ...new Set(
        this.characters.map(c => c.faction?.name).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique general faction names from the current character list. */
  get uniqueGeneralFactions(): string[] {
    return [
      ...new Set(
        this.characters
          .map(c => c.generalFaction?.name)
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique sex names from the current character list. */
  get uniqueSexes(): string[] {
    return [
      ...new Set(
        this.characters.map(c => c.sex?.name).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique class names from the current character list. */
  get uniqueClasses(): string[] {
    return [
      ...new Set(
        this.characters.map(c => c.class?.name).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /** Unique recruit type names from the current character list. */
  get uniqueRecruitTypes(): string[] {
    return [
      ...new Set(
        this.characters
          .map(c => c.recruitType?.name)
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Resets all filters to their default (empty) values.
   *
   */
  clearFilters(): void {
    this.searchText = '';
    this.filterRank = '';
    this.filterSpecies = '';
    this.filterFaction = '';
    this.filterGeneralFaction = '';
    this.filterSex = '';
    this.filterClass = '';
    this.filterRecruitType = '';
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const handle = decodeStoHandle(params['handle']);
      if (handle) {
        this.loadAccountData(handle);
      }
    });
  }

  loadAccountData(handle: string): void {
    this.isLoading = true;
    // We fetch all accounts and find the one with the handle
    // In a real app with many accounts, a backend endpoint for this would be better
    this.stoAccountService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: accounts => {
          this.account = accounts.find(a => a.handle === handle) || null;
          if (this.account) {
            this.loadCharacters(this.account.id);
          } else {
            this.isLoading = false;
            this.errorMessage = 'Account not found';
          }
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load account details';
          console.error(err);
        },
      });
  }

  loadCharacters(accountId: string): void {
    this.characterService
      .getCharactersByAccount(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: characters => {
          this.characters = characters;
          this.isLoading = false;
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load characters';
          console.error(err);
        },
      });
  }

  editAccount(): void {
    if (!this.account) return;

    const dialogRef = this.dialog.open(AccountDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        account: this.account,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && this.account) {
          // Reload account data. If the handle changed, we need to navigate.
          const currentHandle = this.account.handle;
          this.stoAccountService
            .getAccount(this.account.id)
            .subscribe(updatedAccount => {
              if (updatedAccount) {
                this.account = updatedAccount;
                if (updatedAccount.handle !== currentHandle) {
                  this.router.navigate([
                    '/dashboard/accounts',
                    encodeStoHandle(updatedAccount.handle),
                  ]);
                }
              }
            });
        }
      });
  }

  addCharacter(): void {
    if (!this.account) return;
    this.router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.account.handle),
      'characters',
      'add',
    ]);
  }

  editCharacter(character: Character): void {
    if (!this.account) return;
    this.router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.account.handle),
      character.handle,
      'edit',
    ]);
  }

  deleteCharacter(character: Character): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Character',
        message: `Are you sure you want to delete ${character.handle}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.characterService.deleteCharacter(character.id).subscribe({
            next: () => {
              if (this.account) this.loadCharacters(this.account.id);
            },
            error: err => {
              console.error('Failed to delete character', err);
            },
          });
        }
      });
  }

  getCharacterLink(character: Character): string[] {
    return [
      '/dashboard/accounts',
      encodeStoHandle(this.account?.handle || ''),
      character.handle,
    ];
  }

  getRouteLink(route: string): string {
    return `/${route}`;
  }

  getFactionClass(character: Character): string {
    return (
      character.generalFaction?.name?.toLowerCase().replaceAll(/\s+/g, '-') ||
      'unknown'
    );
  }

  getClassCategory(character: Character): string {
    const className = character.class?.name?.toLowerCase() || '';
    if (className.includes('tactical')) return 'tactical';
    if (className.includes('engineering')) return 'engineering';
    if (className.includes('science')) return 'science';
    return 'unknown';
  }

  getSexIcon(character: Character): string {
    const sex = character.sex?.name?.toLowerCase() || '';
    if (sex === 'male') return 'mars';
    if (sex === 'female') return 'venus';
    return 'circle-question';
  }
  onProfileImageError(characterId: string): void {
    this.failedImageIds.add(characterId);
  }

  getProfileImageUrl(character: Character): string {
    if (this.failedImageIds.has(character.id)) {
      return this.unavailablePhotoSrc;
    }

    if (character.profilePicture100) {
      return this.formatImageUrl(
        character.profilePicture100,
        CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
      );
    }
    if (character.profilePicture300) {
      return this.formatImageUrl(
        character.profilePicture300,
        CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
      );
    }
    if (character.profilePicture) {
      return this.formatImageUrl(character.profilePicture);
    }
    return this.unavailablePhotoSrc;
  }

  private formatImageUrl(
    element: string,
    variant: string = CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  ): string {
    if (element.startsWith('http')) {
      return element;
    }

    // If it starts with 'local/', represent a path in Cloudflare R2
    if (element.startsWith('local/')) {
      return `${CLOUDFLARE_R2_PUBLIC_URL}/${element}`;
    }

    // Otherwise assume it's a Cloudflare Images ID
    return `${BASE_CLOUDFLARE_IMAGES_URL}/${element}/${variant}`;
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
