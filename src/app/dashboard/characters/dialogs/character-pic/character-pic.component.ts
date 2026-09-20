import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { ImageCropperBaseComponent } from 'src/app/shared/base/image-cropper-base.component';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

@Component({
  selector: 'app-character-pic',
  templateUrl: './character-pic.component.html',
  styleUrls: ['./character-pic.component.scss'],
  standalone: true,
  imports: [
    ImageCropperComponent,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    AssetScanStatusComponent,
    LcarsWarningMessageComponent,
  ],
})
export class CharacterPicComponent extends ImageCropperBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<CharacterPicComponent>,
  );
  public data = inject(MAT_DIALOG_DATA) as {
    character: Character;
  };

  private readonly _characterService = inject(CharacterService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  onUploadImageClick(): void {
    try {
      if (!this.validateCroppedImage()) return;

      const formData = new FormData();
      formData.append(
        'profilePicture',
        this.croppedImageBlob!,
        'character-pic.png',
      );

      this.isSubmitting = true;
      this._characterService
        .updateCharacterProfilePic(this.data.character.id, formData)
        .pipe(observeInZone(this._ngZone, this._cdr))
        .subscribe({
          // The portrait is not on the Character yet: it is held privately
          // and scanned first, and this dialogue says where it has got to
          // until it is in use or was refused — FC-012.
          next: accepted => this.watchUpload(accepted),
          error: error => {
            this.handleHttpError(error);
            this.isSubmitting = false;
          },
        });
    } catch (error) {
      console.error('Error processing image blob:', error);
      this.displayErrorMessage('Invalid image format.');
      this.isSubmitting = false;
    }
  }
}
