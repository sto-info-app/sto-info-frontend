import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

import { ImageCropPickerComponent } from './image-crop-picker.component';

describe('ImageCropPickerComponent', () => {
  let fixture: ComponentFixture<ImageCropPickerComponent>;

  /**
   * Shows the picker.
   *
   * @param chosen - The choice of picture, if one has been made.
   * @param disabled - Whether choosing is closed.
   */
  const show = (chosen: Event | null, disabled?: boolean): void => {
    fixture = TestBed.createComponent(ImageCropPickerComponent);
    fixture.componentRef.setInput('label', 'Banner');
    fixture.componentRef.setInput('imageChangedEvent', chosen);
    fixture.componentRef.setInput('aspectRatio', 5);
    fixture.componentRef.setInput('format', 'jpeg');
    if (disabled !== undefined) {
      fixture.componentRef.setInput('disabled', disabled);
    }
    fixture.detectChanges();
  };

  /** @returns The file input. */
  const fileInput = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

  /** @returns The cropper, if shown. */
  const cropper = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('image-cropper');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImageCropPickerComponent] });
    // The real cropper reads the picture; the picker only passes it on.
    TestBed.overrideComponent(ImageCropPickerComponent, {
      remove: { imports: [ImageCropperComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  it('offers a picture for the slot, with no cropper until one is chosen', () => {
    show(null);

    expect(fileInput().title).toBe('Choose a picture for the Banner');
    expect(fileInput().getAttribute('aria-label')).toBe(
      'Choose a picture for the Banner',
    );
    expect(fileInput().disabled).toBe(false);
    expect(cropper()).toBeNull();
  });

  it('passes the choice on', () => {
    show(null);
    const chosen: Event[] = [];
    fixture.componentInstance.fileChange.subscribe(event => chosen.push(event));

    fileInput().dispatchEvent(new Event('change'));

    expect(chosen).toHaveLength(1);
  });

  it('closes choosing while an upload is under way', () => {
    show(null, true);

    expect(fileInput().disabled).toBe(true);
  });

  it('crops the chosen picture to the slot, passing the crop on', () => {
    const choice = new Event('change');
    show(choice);
    const crops: ImageCroppedEvent[] = [];
    let failures = 0;
    fixture.componentInstance.imageCropped.subscribe(crop => crops.push(crop));
    fixture.componentInstance.loadImageFailed.subscribe(() => failures++);

    const element = fixture.debugElement.query(By.css('image-cropper'));
    const crop = { width: 10, height: 2 } as ImageCroppedEvent;
    element.triggerEventHandler('imageCropped', crop);
    element.triggerEventHandler('loadImageFailed');

    expect(cropper()).not.toBeNull();
    expect(element.properties['imageChangedEvent']).toBe(choice);
    expect(element.properties['aspectRatio']).toBe(5);
    expect(element.properties['format']).toBe('jpeg');
    expect(element.properties['maintainAspectRatio']).toBe(true);
    expect(element.properties['output']).toBe('blob');
    expect(crops).toEqual([crop]);
    expect(failures).toBe(1);
  });
});
