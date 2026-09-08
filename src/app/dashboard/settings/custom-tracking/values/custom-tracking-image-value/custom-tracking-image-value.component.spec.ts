import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import {
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

import { CustomTrackingService } from '../../custom-tracking.service';
import { CustomTrackingImageDialogComponent } from '../custom-tracking-image-dialog/custom-tracking-image-dialog.component';
import {
  aConfiguration,
  aField,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';
import { CustomTrackingImageValueComponent } from './custom-tracking-image-value.component';

describe('CustomTrackingImageValueComponent', () => {
  const picture = {
    imageId: 'image-1',
    altText: 'A ship at speed',
    shape: CustomTrackingImageShape.SQUARE,
  };

  let fixture: ComponentFixture<CustomTrackingImageValueComponent>;
  let component: CustomTrackingImageValueComponent;
  let open: jest.Mock;
  let removeImage: jest.Mock;

  const text = (): string => fixture.nativeElement.textContent as string;

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const buttonSaying = (label: string): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as HTMLButtonElement[],
    ).filter(button => (button.textContent ?? '').includes(label))[0];

  const build = (
    overrides: Partial<CustomTrackingImageValueComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingImageValueComponent);
    component = fixture.componentInstance;
    component.field = aField({
      fieldType: CustomTrackingFieldType.IMAGE,
      name: 'Ship picture',
      configuration: { shape: CustomTrackingImageShape.SQUARE },
    });
    component.configuration = aConfiguration();
    component.scope = CustomTrackingTargetScope.ACCOUNT;
    component.targetId = 'target-1';
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    open = jest.fn().mockReturnValue({ afterClosed: () => of(picture) });
    removeImage = jest.fn().mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [CustomTrackingImageValueComponent],
      providers: [
        { provide: MatDialog, useValue: { open } },
        { provide: CustomTrackingService, useValue: { removeImage } },
      ],
    }).compileComponents();
  });

  it('says there is no picture yet', () => {
    build();

    expect(text()).toContain('No picture yet');
    expect(text()).toContain('Add picture');
  });

  it('shows the picture and what it shows', () => {
    build({ image: picture });

    expect(query<HTMLImageElement>('img').alt).toBe('A ship at speed');
    expect(text()).toContain('A ship at speed');
  });

  // Built from the variant the server publishes for the shape, so a renamed
  // variant cannot leave a broken picture that reports no error at all.
  it('fetches the picture through the variant the server named', () => {
    build({ image: picture });

    expect(query<HTMLImageElement>('img').src).toContain('/image-1/square300');
  });

  it('shows nothing where the field names a shape the server does not', () => {
    build({
      field: aField({
        fieldType: CustomTrackingFieldType.IMAGE,
        configuration: { shape: CustomTrackingImageShape.PORTRAIT },
      }),
      image: picture,
    });

    expect(component.spec).toBeNull();
    expect(component.imageUrl).toBe('');
  });

  it('refuses to open a cropper for a shape it cannot describe', () => {
    build({
      field: aField({
        fieldType: CustomTrackingFieldType.IMAGE,
        configuration: { shape: CustomTrackingImageShape.PORTRAIT },
      }),
    });

    component.choose();

    expect(open).not.toHaveBeenCalled();
  });

  // The description is asked for in the cropper, where somebody is certainly
  // looking at the picture, so a replacement starts from the one already there.
  it('opens the cropper with the shape and the description already given', () => {
    build({ image: picture });

    buttonSaying('Replace picture').click();

    expect(open).toHaveBeenCalledWith(
      CustomTrackingImageDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          fieldId: 'field-1',
          fieldName: 'Ship picture',
          currentAlt: 'A ship at speed',
          altMaxLength: 200,
        }),
      }),
    );
  });

  it('reports the picture the server stored', () => {
    build();

    const reported: unknown[] = [];

    component.changed.subscribe(image => reported.push(image));
    buttonSaying('Add picture').click();
    fixture.detectChanges();

    expect(reported).toEqual([picture]);
    expect(text()).toContain('A ship at speed');
  });

  it('changes nothing where the cropper was closed without uploading', () => {
    open.mockReturnValue({ afterClosed: () => of(undefined) });
    build();

    const reported: unknown[] = [];

    component.changed.subscribe(image => reported.push(image));
    buttonSaying('Add picture').click();

    expect(reported).toEqual([]);
  });

  it('asks before removing a picture', () => {
    build({ image: picture });

    open.mockReturnValue({ afterClosed: () => of(false) });
    buttonSaying('Remove picture').click();

    expect(open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ confirmText: 'Remove' }),
      }),
    );
    expect(removeImage).not.toHaveBeenCalled();
  });

  it('removes the picture once it has been confirmed', () => {
    build({ image: picture });

    open.mockReturnValue({ afterClosed: () => of(true) });

    const reported: unknown[] = [];

    component.changed.subscribe(image => reported.push(image));
    buttonSaying('Remove picture').click();
    fixture.detectChanges();

    expect(removeImage).toHaveBeenCalledWith(
      'field-1',
      CustomTrackingTargetScope.ACCOUNT,
      'target-1',
    );
    expect(reported).toEqual([null]);
    expect(text()).toContain('No picture yet');
  });

  it('says so when a picture could not be removed', () => {
    build({ image: picture });

    open.mockReturnValue({ afterClosed: () => of(true) });
    removeImage.mockReturnValue(throwError(() => new Error('no')));
    buttonSaying('Remove picture').click();
    fixture.detectChanges();

    expect(text()).toContain('could not be removed');
  });

  // Anything already uploaded is untouched while pictures are switched off, so
  // the page says so rather than letting the pause look like data loss.
  it('offers nothing while pictures are switched off', () => {
    const configuration = aConfiguration();

    configuration.features.imagesEnabled = false;
    build({ configuration, image: picture });

    expect(text()).toContain('switched off');
    expect(buttonSaying('Add picture')).toBeUndefined();
  });
});
