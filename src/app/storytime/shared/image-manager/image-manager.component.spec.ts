import { Component, NgZone, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { StorytimeImageSlot } from '../../storytime-image.constants';
import { StorytimeImageService } from '../../storytime-image.service';
import { StorytimeImageCropDialogComponent } from '../image-crop-dialog/image-crop-dialog.component';
import { ImageManagerComponent } from './image-manager.component';

/**
 * A form for the manager to reach into, standing in for a real editor.
 *
 * The description belongs to the editor's own form rather than to the manager,
 * so a host is the only honest way to render it.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ImageManagerComponent],
  template: `<form [formGroup]="form">
    <app-storytime-image-manager
      [slot]="slot"
      targetId="work-1"
      [imageUrl]="imageUrl"
      [imageAlt]="imageAlt"
      altControlName="bannerImageAlt"
      (changed)="onChanged($event)" />
  </form>`,
})
class HostComponent {
  @ViewChild(ImageManagerComponent) manager!: ImageManagerComponent;

  slot = StorytimeImageSlot.STORY_BANNER;
  imageUrl: string | null = null;
  imageAlt: string | null = null;
  changed: unknown = null;

  form: FormGroup = new FormBuilder().group({
    bannerImageAlt: ['A ship', Validators.maxLength(300)],
  });

  /**
   * Records what the manager handed back.
   *
   * @param updated - The work as the server now holds it.
   */
  onChanged(updated: unknown): void {
    this.changed = updated;
  }
}

describe('ImageManagerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let dialog: { open: jest.Mock };
  let imageService: { upload: jest.Mock; remove: jest.Mock };

  const updatedWork = { id: 'work-1', bannerImageAlt: 'A fleet' };

  /**
   * Renders the host, with whatever picture the test wants in the slot.
   *
   * @param imageUrl - The picture, or null for an empty slot.
   * @returns The rendered element.
   */
  const render = (imageUrl: string | null = null): HTMLElement => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.imageUrl = imageUrl;
    fixture.componentInstance.imageAlt = imageUrl ? 'A ship' : null;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Finds a button by the words on it.
   *
   * @param element - The rendered element.
   * @param label - The button's text.
   * @returns The button.
   */
  const button = (element: HTMLElement, label: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find(
      candidate => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;

  beforeEach(() => {
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(null) }),
    };
    imageService = {
      upload: jest.fn().mockReturnValue(of(updatedWork)),
      remove: jest.fn().mockReturnValue(of(updatedWork)),
    };

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: StorytimeImageService, useValue: imageService },
      ],
    });
  });

  it('is created', () => {
    render();
    expect(fixture.componentInstance.manager).toBeTruthy();
  });

  describe('an empty slot', () => {
    // Nothing stands in for a missing picture: no placeholder, no empty frame.
    // An artless Story should look like a Story without art, not like one
    // whose art failed to load.
    it('renders no image and no reserved space', () => {
      const element = render();

      expect(element.querySelector('img')).toBeNull();
      expect(
        element.querySelector('.storytime-image-manager__preview'),
      ).toBeNull();
    });

    it('offers to add one, and nothing to remove', () => {
      const element = render();

      expect(button(element, 'Add')).toBeTruthy();
      expect(button(element, 'Remove')).toBeUndefined();
    });

    // A description of nothing would be stored against an empty slot and read
    // out over whatever was uploaded into it next.
    it('does not ask for a description', () => {
      const element = render();

      expect(element.querySelector('input[type="text"]')).toBeNull();
    });
  });

  describe('a filled slot', () => {
    it('shows the picture with the description as its alternative text', () => {
      const element = render('https://images.example/banner');
      const image = element.querySelector('img') as HTMLImageElement;

      expect(image.getAttribute('src')).toBe('https://images.example/banner');
      expect(image.getAttribute('alt')).toBe('A ship');
    });

    it('offers to replace and to remove', () => {
      const element = render('https://images.example/banner');

      expect(button(element, 'Replace')).toBeTruthy();
      expect(button(element, 'Remove')).toBeTruthy();
    });

    it('binds the description to the editor own form', () => {
      const element = render('https://images.example/banner');
      const input = element.querySelector(
        '#storytime-alt-STORY_BANNER',
      ) as HTMLInputElement;

      expect(input.value).toBe('A ship');
    });
  });

  describe('choosing a picture', () => {
    it('opens the crop dialog for this slot and work', () => {
      const element = render();

      button(element, 'Add').click();

      expect(dialog.open).toHaveBeenCalledWith(
        StorytimeImageCropDialogComponent,
        expect.objectContaining({
          data: {
            slot: StorytimeImageSlot.STORY_BANNER,
            targetId: 'work-1',
            currentAlt: null,
          },
        }),
      );
    });

    it('hands the updated work back when one comes out of the dialog', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(updatedWork) });
      const element = render();

      button(element, 'Add').click();

      expect(fixture.componentInstance.changed).toBe(updatedWork);
    });

    // The dialog closes on the back of its upload's response, and this app
    // loads scripts that patch XMLHttpRequest out of zone.js's sight, so the
    // result arrives outside the Angular zone. Handing it on from there leaves
    // the editor holding the new picture with nothing to render it: the Add
    // button stays on screen until the page is reloaded.
    it('hands it on inside the Angular zone, however it arrives', () => {
      const closed = new Subject<unknown>();
      dialog.open.mockReturnValue({ afterClosed: () => closed.asObservable() });
      const element = render();

      let wasInZone = false;
      fixture.componentInstance.manager.changed.subscribe(() => {
        wasInZone = NgZone.isInAngularZone();
      });

      button(element, 'Add').click();
      // As it arrives in the browser, where zone.js has lost sight of the
      // request the dialog closed on the back of.
      TestBed.inject(NgZone).runOutsideAngular(() => closed.next(updatedWork));

      expect(wasInZone).toBe(true);
      expect(fixture.componentInstance.changed).toBe(updatedWork);
    });

    // Cancelling is not a failure, and leaves the slot exactly as it was.
    it('changes nothing when the dialog is cancelled', () => {
      const element = render();

      button(element, 'Add').click();

      expect(fixture.componentInstance.changed).toBeNull();
    });
  });

  describe('removing a picture', () => {
    /**
     * Renders a filled slot and answers the confirmation.
     *
     * @param confirmed - What the person chose.
     * @returns The rendered element.
     */
    const removeWith = (confirmed: boolean): HTMLElement => {
      dialog.open.mockReturnValue({ afterClosed: () => of(confirmed) });
      const element = render('https://images.example/banner');

      button(element, 'Remove').click();
      fixture.detectChanges();

      return element;
    };

    // There is no undo: the picture is deleted, and putting it back means
    // finding the original again.
    it('asks before deleting anything', () => {
      removeWith(false);

      expect(dialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({ confirmText: 'Remove' }),
        }),
      );
      expect(imageService.remove).not.toHaveBeenCalled();
    });

    it('empties the slot once confirmed', () => {
      removeWith(true);

      expect(imageService.remove).toHaveBeenCalledWith(
        StorytimeImageSlot.STORY_BANNER,
        'work-1',
      );
      expect(fixture.componentInstance.changed).toBe(updatedWork);
    });

    it('repeats what the server said when it refused', () => {
      imageService.remove.mockReturnValue(
        throwError(() => ({ error: { message: 'You may not edit this.' } })),
      );

      const element = removeWith(true);

      expect(element.textContent).toContain('You may not edit this.');
    });

    it('says something useful when the server explained nothing', () => {
      imageService.remove.mockReturnValue(throwError(() => ({})));

      const element = removeWith(true);

      expect(element.textContent).toContain('could not be removed');
    });
  });
});
