import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of, throwError } from 'rxjs';

import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import { FleetImageService } from 'src/app/fleet/fleet-image.service';
import { FleetImageCropDialogComponent } from 'src/app/fleet/images/fleet-image-crop-dialog/fleet-image-crop-dialog.component';
import { FleetScopeArtworkVm } from 'src/app/fleet/scope/fleet-scope-page.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

import {
  ARTWORK_REMOVE_FAILED,
  FleetScopeArtworkComponent,
} from './fleet-scope-artwork.component';

/**
 * Builds the artwork a page is offering.
 *
 * @param overrides - Fields to override on the two slots.
 * @returns The view model.
 */
function artwork(
  overrides: {
    banner?: Partial<FleetScopeArtworkVm['slots'][number]>;
    emblem?: Partial<FleetScopeArtworkVm['slots'][number]>;
  } = {},
): FleetScopeArtworkVm {
  return {
    target: { kind: 'COMMUNITY', communityId: 'community-1' },
    scopeName: 'Jupiter Force',
    slots: [
      {
        slot: FleetImageSlot.BANNER,
        label: 'Banner',
        picture: null,
        mayManage: true,
        ...overrides.banner,
      },
      {
        slot: FleetImageSlot.EMBLEM,
        label: 'Emblem',
        picture: null,
        mayManage: true,
        ...overrides.emblem,
      },
    ],
  };
}

describe('FleetScopeArtworkComponent', () => {
  let fixture: ComponentFixture<FleetScopeArtworkComponent>;
  let component: FleetScopeArtworkComponent;
  let dialog: { open: jest.Mock };
  let images: { remove: jest.Mock };
  let closed: unknown;

  beforeEach(async () => {
    closed = true;
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(closed) })) };
    images = { remove: jest.fn(() => of(undefined)) };

    await TestBed.configureTestingModule({
      imports: [FleetScopeArtworkComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: FleetImageService, useValue: images },
      ],
    }).compileComponents();
  });

  /**
   * Renders the strip.
   *
   * @param vm - What it is offering.
   * @returns The rendered element.
   */
  function render(vm: FleetScopeArtworkVm = artwork()): HTMLElement {
    fixture = TestBed.createComponent(FleetScopeArtworkComponent);
    component = fixture.componentInstance;
    component.vm = vm;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  /** Every button the strip is showing. */
  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  /**
   * Finds a button by its label.
   *
   * @param label - The text on it.
   * @returns The button.
   */
  const buttonFor = (label: string): HTMLButtonElement =>
    buttons().find(button =>
      button.textContent?.includes(label),
    ) as HTMLButtonElement;

  /*
   * A row of disabled buttons would tell a reader about a permission they do
   * not have and did not ask about — and at an unregistered Fleet it would
   * say the picture is somebody else's in the least useful way possible.
   */
  it('draws nothing for a slot the viewer may not change', () => {
    const element = render(artwork({ emblem: { mayManage: false } }));

    expect(element.textContent).toContain('Banner');
    expect(element.textContent).not.toContain('Emblem');
  });

  it('says which slots are empty', () => {
    const element = render();

    expect(element.textContent).toContain('Not set');
  });

  /*
   * The description is the only thing distinguishing two pictures in a list
   * of words, so it is what the row shows.
   */
  it('names what is in a filled slot by its description', () => {
    const element = render(
      artwork({
        banner: { picture: { url: 'u', alt: 'The Jupiter shipyards' } },
      }),
    );

    expect(element.textContent).toContain('The Jupiter shipyards');
  });

  it('says so when a picture is there but nobody described it', () => {
    const element = render(
      artwork({ banner: { picture: { url: 'u', alt: '' } } }),
    );

    expect(element.textContent).toContain('Set, with no description');
  });

  /*
   * Setting and replacing are different acts, and somebody about to paint
   * over a picture should be told that is what they are doing.
   */
  it('offers to set an empty slot and to replace a filled one', () => {
    const element = render(
      artwork({ emblem: { picture: { url: 'u', alt: 'A badge' } } }),
    );

    expect(element.textContent).toContain('Set the banner');
    expect(element.textContent).toContain('Replace the emblem');
  });

  it('offers removal only where there is something to remove', () => {
    render(artwork({ emblem: { picture: { url: 'u', alt: 'A badge' } } }));

    expect(
      buttons().filter(b => b.textContent?.includes('Remove')),
    ).toHaveLength(1);
  });

  describe('changing a picture', () => {
    it('opens the cropper for the slot and the record', () => {
      render();

      buttonFor('Set the banner').click();

      expect(dialog.open).toHaveBeenCalledWith(
        FleetImageCropDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            slot: FleetImageSlot.BANNER,
            target: { kind: 'COMMUNITY', communityId: 'community-1' },
            scopeName: 'Jupiter Force',
          }),
        }),
      );
    });

    /*
     * Most replacements show the same thing a little better, and retyping
     * the description is how a picture ends up described as the last one.
     */
    it('starts a replacement from the description already there', () => {
      render(
        artwork({
          banner: { picture: { url: 'u', alt: 'The Jupiter shipyards' } },
        }),
      );

      buttonFor('Replace the banner').click();

      expect(dialog.open.mock.calls[0][1].data.currentAlt).toBe(
        'The Jupiter shipyards',
      );
    });

    it('sends nothing to describe for an empty slot', () => {
      render();

      buttonFor('Set the banner').click();

      expect(dialog.open.mock.calls[0][1].data.currentAlt).toBeNull();
    });

    /*
     * What a picture is delivered from only comes into existence when its
     * scan clears, so the page reads the record again rather than guessing.
     */
    it('asks the page to read the record again once one is published', () => {
      render();

      const changed = jest.fn();

      component.changed.subscribe(changed);
      buttonFor('Set the banner').click();

      expect(changed).toHaveBeenCalled();
    });

    it('asks for nothing when the cropper was closed unused', () => {
      closed = undefined;
      render();

      const changed = jest.fn();

      component.changed.subscribe(changed);
      buttonFor('Set the banner').click();

      expect(changed).not.toHaveBeenCalled();
    });
  });

  describe('removing a picture', () => {
    const filled = () =>
      artwork({ banner: { picture: { url: 'u', alt: 'A ship' } } });

    it('asks before taking anything down', () => {
      render(filled());

      buttonFor('Remove').click();

      expect(dialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({ confirmText: 'Remove' }),
        }),
      );
      expect(images.remove).toHaveBeenCalledWith(
        { kind: 'COMMUNITY', communityId: 'community-1' },
        FleetImageSlot.BANNER,
      );
    });

    it('takes nothing down when the confirmation is declined', () => {
      closed = false;
      render(filled());

      buttonFor('Remove').click();

      expect(images.remove).not.toHaveBeenCalled();
    });

    it('asks the page to read the record again once it has gone', () => {
      render(filled());

      const changed = jest.fn();

      component.changed.subscribe(changed);
      buttonFor('Remove').click();

      expect(changed).toHaveBeenCalled();
    });

    /*
     * The server names the specific problem — somebody else's picture, a
     * slot already empty — which is more use than a general failure.
     */
    it('repeats what the server said when it refused', () => {
      images.remove.mockReturnValue(
        throwError(() => ({
          error: { message: 'Somebody else put that picture there.' },
        })),
      );
      render(filled());

      buttonFor('Remove').click();

      expect(component.errorMessage).toBe(
        'Somebody else put that picture there.',
      );
    });

    it('falls back to its own wording when the server explained nothing', () => {
      images.remove.mockReturnValue(throwError(() => ({})));
      render(filled());

      buttonFor('Remove').click();

      expect(component.errorMessage).toBe(ARTWORK_REMOVE_FAILED);
    });

    it('clears a previous failure before trying again', () => {
      images.remove.mockReturnValueOnce(throwError(() => ({})));
      render(filled());

      buttonFor('Remove').click();
      expect(component.errorMessage).toBe(ARTWORK_REMOVE_FAILED);

      buttonFor('Remove').click();
      expect(component.errorMessage).toBe('');
    });

    it('clears a previous failure before opening the cropper', () => {
      images.remove.mockReturnValue(throwError(() => ({})));
      render(filled());

      buttonFor('Remove').click();
      buttonFor('Replace the banner').click();

      expect(component.errorMessage).toBe('');
    });
  });

  it('tracks a row by which picture it is', () => {
    render();

    expect(component.trackSlot(0, component.vm.slots[1])).toBe(
      FleetImageSlot.EMBLEM,
    );
  });
});
