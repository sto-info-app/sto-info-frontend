import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { ImageCropperBaseComponent } from 'src/app/dashboard/base/image-cropper-base.component';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

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
  ],
})
export class CharacterPicComponent extends ImageCropperBaseComponent {
  protected override readonly dialogRef = inject(
    MatDialogRef<CharacterPicComponent>,
  );
  public data = inject(MAT_DIALOG_DATA) as {
    character: Character;
  };

  private readonly characterService = inject(CharacterService);

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
      this.characterService
        .updateCharacterProfilePic(this.data.character.id, formData)
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.dialogRef?.close(true);
          },
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
