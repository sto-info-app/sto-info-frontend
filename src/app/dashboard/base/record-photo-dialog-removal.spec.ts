import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';

import { CharacterPicComponent } from 'src/app/dashboard/characters/dialogs/character-pic/character-pic.component';
import { ProfilePicComponent } from 'src/app/dashboard/profile/dialogs/profile-pic/profile-pic.component';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';
import { AssetScanService } from 'src/app/shared/services/asset-scan.service';

import { RecordPhotoDialogBaseComponent } from './record-photo-dialog-base.component';

/** One of the two record photo dialogues, and how its removal is sent. */
interface DialogCase {
  readonly name: string;
  readonly component: Type<RecordPhotoDialogBaseComponent>;
  /** The dialogue's data, with or without a photo on the record. */
  readonly data: (withPhoto: boolean) => unknown;
  /** The service method that takes the photo down. */
  readonly removal: () => jest.Mock;
}

const removeProfilePic = jest.fn();
const removeCharacterProfilePic = jest.fn();

const CASES: DialogCase[] = [
  {
    name: 'ProfilePicComponent',
    component: ProfilePicComponent,
    data: withPhoto => ({
      user: {
        id: 'user-1',
        profile: { profilePicture: withPhoto ? 'https://cdn/photo' : null },
      },
    }),
    removal: () => removeProfilePic,
  },
  {
    name: 'CharacterPicComponent',
    component: CharacterPicComponent,
    data: withPhoto => ({
      character: {
        id: 'char-1',
        handle: 'Thalis',
        profilePicture: withPhoto ? 'https://cdn/portrait' : null,
      },
    }),
    removal: () => removeCharacterProfilePic,
  },
];

describe.each(CASES)('$name removing the photo', dialogCase => {
  let fixture: ComponentFixture<RecordPhotoDialogBaseComponent>;
  let dialogRef: { close: jest.Mock };
  let confirm: { open: jest.Mock };
  let confirmed: Observable<boolean>;

  /**
   * Opens the dialogue on a record with or without a photo.
   *
   * Arranged before the first change detection, which is the only one an
   * OnPush dialogue is sure to see.
   *
   * @param withPhoto - Whether the record shows a photo.
   */
  const open = async (withPhoto: boolean): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [dialogCase.component, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogCase.data(withPhoto) },
        { provide: DashboardService, useValue: { removeProfilePic } },
        { provide: CharacterService, useValue: { removeCharacterProfilePic } },
        { provide: AssetScanService, useValue: { watch: jest.fn() } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: confirm })
      .compileComponents();

    fixture = TestBed.createComponent(dialogCase.component);
    fixture.detectChanges();
  };

  /** @returns The Remove button, when the dialogue shows one. */
  const removeButton = (): HTMLButtonElement | undefined =>
    fixture.debugElement
      .queryAll(By.css('button'))
      .map(button => button.nativeElement as HTMLButtonElement)
      .find(button => button.textContent?.trim() === 'Remove');

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    confirmed = of(true);
    confirm = {
      open: jest.fn(() => ({ afterClosed: () => confirmed })),
    };
    dialogCase.removal().mockReset().mockReturnValue(of(undefined));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('offers no Remove when the record has no photo', async () => {
    await open(false);

    expect(removeButton()).toBeUndefined();
  });

  it('asks before taking the photo down, then closes for the page to refresh', async () => {
    await open(true);

    removeButton()!.click();

    expect(confirm.open).toHaveBeenCalledWith(ConfirmDialogComponent, {
      data: expect.objectContaining({
        title: 'Remove the photo?',
        confirmText: 'Remove',
        cancelText: 'Keep it',
      }),
    });
    expect(dialogCase.removal()).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('keeps the photo when the reader thinks better of it', async () => {
    confirmed = of(false);
    await open(true);

    removeButton()!.click();

    expect(dialogCase.removal()).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('says so, and stays open, when the photo could not be taken down', async () => {
    dialogCase.removal().mockReturnValue(throwError(() => ({ status: 0 })));
    await open(true);

    removeButton()!.click();

    const component = fixture.componentInstance;
    expect(component.errorMessage).toBe(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
    expect(component.isSubmitting).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('stops offering Remove once a new photo is being chosen', async () => {
    await open(true);

    // Through the real input, so the dialogue sees the change as a reader's.
    const input = fixture.debugElement.query(By.css('input[type="file"]'))
      .nativeElement as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File([''], 'new.png', { type: 'image/png' })],
    });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(removeButton()).toBeUndefined();
  });
});
