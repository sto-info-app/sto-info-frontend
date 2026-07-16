import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, Subject, catchError, switchMap, takeUntil } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
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
import { CharacterPicComponent } from '../dialogs/character-pic/character-pic.component';

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
    MatButtonModule,
  ],
})
export class CharacterDetailComponent implements OnInit, OnDestroy {
  character: Character | null = null;
  accountHandle = '';
  isLoading = true;
  errorMessage = '';
  imageFailed = false;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _characterService = inject(CharacterService);
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _dialog = inject(MatDialog);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  public readonly appRoutes = APP_ROUTES;
  public readonly unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  ngOnInit(): void {
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
            catchError(err => {
              this.isLoading = false;
              this.errorMessage = 'Failed to load account';
              console.error(err);
              this._cdr.markForCheck();
              return EMPTY;
            }),
            switchMap(accounts => {
              const account = accounts.find(
                a => a.handle === this.accountHandle,
              );
              if (!account) {
                this.isLoading = false;
                this.errorMessage = 'Account not found';
                this._cdr.markForCheck();
                return EMPTY;
              }
              return this._characterService
                .getCharactersByAccount(account.id)
                .pipe(
                  catchError(err => {
                    this.isLoading = false;
                    this.errorMessage = 'Failed to load account characters';
                    console.error(err);
                    this._cdr.markForCheck();
                    return EMPTY;
                  }),
                  switchMap(characters => {
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
                );
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

  editCharacter(): void {
    if (!this.character) return;
    this._router.navigate([
      '/dashboard/accounts',
      encodeStoHandle(this.accountHandle),
      this.character.handle,
      'edit',
    ]);
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

  getReputationsLink(): string[] {
    return [
      '/dashboard/accounts',
      encodeStoHandle(this.accountHandle),
      this.character?.handle ?? '',
      'reputations',
    ];
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
