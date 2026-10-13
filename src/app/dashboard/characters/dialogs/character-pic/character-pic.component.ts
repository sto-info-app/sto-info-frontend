import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { Observable } from 'rxjs';
import { RecordPhotoDialogBaseComponent } from 'src/app/dashboard/base/record-photo-dialog-base.component';
import { Character } from 'src/app/dashboard/models/character.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

@Component({
  selector: 'app-character-pic',
  templateUrl: '../../../base/record-photo-dialog.component.html',
  styleUrls: ['./character-pic.component.scss'],
  standalone: true,
  imports: [
    ImageCropperComponent,
    MatDialogModule,
    NgTemplateOutlet,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    AssetScanStatusComponent,
    LcarsWarningMessageComponent,
  ],
})
export class CharacterPicComponent extends RecordPhotoDialogBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<CharacterPicComponent>,
  );
  public data = inject(MAT_DIALOG_DATA) as {
    character: Character;
  };

  readonly heading = 'Character Personnel Record Photo: Edit';
  readonly unavailableMessage =
    'Connection to the Starfleet Character Database has failed!';
  readonly layout = {
    row: 'lcars-pic-layout',
    main: 'lcars-pic-main-col',
    side: 'lcars-pic-side-col',
  };

  protected readonly _fileName = 'character-pic.png';

  private readonly _characterService = inject(CharacterService);

  /** @returns True once the Character is known. */
  get hasRecord(): boolean {
    return !!this.data.character;
  }

  /**
   * Sends the portrait to the Character's record.
   *
   * @param formData - The portrait.
   * @returns What the upload endpoint answered.
   */
  protected send(formData: FormData): Observable<AcceptedAsset> {
    return this._characterService.updateCharacterProfilePic(
      this.data.character.id,
      formData,
    );
  }
}
