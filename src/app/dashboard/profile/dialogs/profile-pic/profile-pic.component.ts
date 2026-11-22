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
import { User } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { AssetScanStatusComponent } from 'src/app/shared/components/asset-scan-status/asset-scan-status.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';
import { EditPersonalDetailsComponent } from '../edit-personal-details/edit-personal-details.component';

@Component({
  selector: 'app-profile-pic',
  templateUrl: '../../../base/record-photo-dialog.component.html',
  styleUrls: ['./profile-pic.component.scss'],
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
export class ProfilePicComponent extends RecordPhotoDialogBaseComponent {
  protected override readonly _dialogRef = inject(
    MatDialogRef<EditPersonalDetailsComponent>,
  );
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    user: User;
  } | null;

  readonly heading = 'Starfleet Personnel Record Photo: Edit';
  readonly unavailableMessage =
    'Connection to the Starfleet Personnel Database has failed!';
  readonly layout = {
    row: 'flexbox',
    main: 'col profile-pic-main-col',
    side: 'col profile-pic-side-col',
  };
  override readonly inActionRow = true;

  protected readonly _fileName = 'profile-pic.png';

  private readonly _dashboardService = inject(DashboardService);

  /** @returns True once the member's record is known. */
  get hasRecord(): boolean {
    return !!this.data?.user;
  }

  /** @returns True when the member's record shows a photo. */
  get hasPhoto(): boolean {
    return !!this.data?.user?.profile?.profilePicture;
  }

  /**
   * Sends the photo to the member's own record.
   *
   * @param formData - The photo.
   * @returns What the upload endpoint answered.
   */
  protected send(formData: FormData): Observable<AcceptedAsset> {
    return this._dashboardService.updateProfilePic(formData);
  }

  /**
   * Takes the photo off the member's own record.
   *
   * @returns Completes once it is down.
   */
  protected sendRemoval(): Observable<void> {
    return this._dashboardService.removeProfilePic();
  }
}
