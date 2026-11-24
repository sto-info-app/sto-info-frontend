import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { Observable, of, throwError } from 'rxjs';

import { LogEntry, LogEntryType } from 'src/app/models/captains-log.models';

import { CaptainsLogService } from '../captains-log.service';
import { LogPictureDialogComponent } from '../log-picture-dialog/log-picture-dialog.component';
import {
  LOG_ENTRY_LOAD_FAILED,
  LOG_ENTRY_REMOVE_FAILED,
  LOG_ENTRY_SAVE_FAILED,
  LOG_GOING_PUBLIC,
  LogEntryEditorComponent,
} from './log-entry-editor.component';

/**
 * Builds an entry as its author sees it.
 *
 * @param overrides - Whatever the case is about.
 * @returns The entry.
 */
const entry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  id: 'entry-1',
  type: LogEntryType.CAPTAIN,
  headline: 'Arrival',
  customHeadline: 'Arrival',
  body: 'We reached the Azure Nebula.',
  stardate: 104502.57,
  pictureUrls: null,
  pictureAlt: null,
  createdAt: '2026-11-24T10:30:00.000Z',
  editedAt: null,
  removedAt: null,
  removedReason: null,
  ...overrides,
});

describe('LogEntryEditorComponent (sc-1450)', () => {
  let log: {
    get: jest.Mock<Observable<LogEntry>>;
    create: jest.Mock<Observable<LogEntry>>;
    update: jest.Mock<Observable<LogEntry>>;
    delete: jest.Mock<Observable<void>>;
    removePicture: jest.Mock<Observable<void>>;
  };
  let dialog: { open: jest.Mock };
  let answers: unknown[];

  /**
   * Opens the editor.
   *
   * @param id - The entry being edited, or null for a new one.
   * @returns The editor, its element and the router's navigate.
   */
  const render = (id: string | null) => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { paramMap: { get: () => id } } },
    });

    const fixture = TestBed.createComponent(LogEntryEditorComponent);
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);

    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
      navigate,
    };
  };

  /**
   * Answers the next dialogs in turn.
   *
   * @param next - What each closes with.
   */
  const answer = (...next: unknown[]): void => {
    answers = next;
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-05-25T00:00:00Z') });
    answers = [];
    dialog = {
      open: jest.fn(() => ({
        afterClosed: () => of(answers.length ? answers.shift() : true),
      })),
    };
    log = {
      get: jest.fn(() => of(entry())),
      create: jest.fn(() => of(entry({ id: 'entry-new' }))),
      update: jest.fn(() => of(entry())),
      delete: jest.fn(() => of(undefined)),
      removePicture: jest.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [LogEntryEditorComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: dialog },
        { provide: CaptainsLogService, useValue: log },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('a new entry', () => {
    it('shows the stardate headline it will have if none is typed, by type', () => {
      const { component, fixture, element } = render(null);

      expect(element.querySelector('h1')!.textContent).toContain('New entry');
      expect(component.stardateHeadline()).toBe(
        "Captain's Log stardate 104000.0",
      );

      component.form.controls.type.setValue(LogEntryType.PERSONAL);
      fixture.detectChanges();

      expect(
        (element.querySelector('#log-headline-input') as HTMLInputElement)
          .placeholder,
      ).toBe('Personal Log stardate 104000.0');
      expect(element.textContent).toContain(
        'Save the entry first; a picture can be added then.',
      );
      expect(log.get).not.toHaveBeenCalled();
      expect(component.picture()).toBeNull();
    });

    it('will not save an entry with no words', () => {
      const { component } = render(null);

      component.save();

      expect(log.create).not.toHaveBeenCalled();
      expect(component.form.controls.body.touched).toBeTrue();
    });

    it('saves it, then opens it for editing so a picture can be added', () => {
      const { component, navigate } = render(null);

      component.form.setValue({
        type: LogEntryType.PERSONAL,
        headline: '  A quiet watch  ',
        body: 'Nothing to report.',
      });
      component.form.markAsDirty();
      component.save();

      expect(dialog.open).not.toHaveBeenCalled();
      expect(log.create).toHaveBeenCalledWith({
        type: LogEntryType.PERSONAL,
        headline: 'A quiet watch',
        body: 'Nothing to report.',
      });
      expect(navigate).toHaveBeenCalledWith(['/dashboard/log/entry-new/edit'], {
        replaceUrl: true,
      });
      expect(component.hasUnsavedChanges()).toBeFalse();
    });

    it('says so when it cannot be saved, and keeps what was typed', () => {
      log.create.mockReturnValue(throwError(() => new Error('offline')));

      const { component } = render(null);

      component.form.patchValue({ body: 'Nothing to report.' });
      component.form.markAsDirty();
      component.save();

      expect(component.errorMessage()).toBe(LOG_ENTRY_SAVE_FAILED);
      expect(component.isSaving()).toBeFalse();
      expect(component.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('an existing entry', () => {
    it('fills the form with what the author wrote, headed by its own stardate', () => {
      log.get.mockReturnValue(of(entry({ customHeadline: null })));

      const { component, element } = render('entry-1');

      expect(log.get).toHaveBeenCalledWith('entry-1');
      expect(element.querySelector('h1')!.textContent).toContain('Edit entry');
      expect(component.form.getRawValue()).toEqual({
        type: LogEntryType.CAPTAIN,
        headline: '',
        body: 'We reached the Azure Nebula.',
      });
      expect(component.stardateHeadline()).toBe(
        "Captain's Log stardate 104502.6",
      );
      expect(component.bodyLength()).toBe(28);
      expect(element.textContent).toContain('This entry has no picture.');
      expect(element.textContent).toContain('Add a picture');
    });

    it('saves a change and goes back to the Log', () => {
      const { component, navigate } = render('entry-1');

      component.form.patchValue({ body: 'Revised.' });
      component.save();

      expect(log.update).toHaveBeenCalledWith('entry-1', {
        type: LogEntryType.CAPTAIN,
        headline: 'Arrival',
        body: 'Revised.',
      });
      expect(navigate).toHaveBeenCalledWith(['/dashboard/log']);
    });

    it('asks before a Personal entry becomes a Captain’s one', () => {
      log.get.mockReturnValue(of(entry({ type: LogEntryType.PERSONAL })));

      const { component } = render('entry-1');

      component.form.patchValue({ type: LogEntryType.CAPTAIN });
      answer(false);
      component.save();

      expect(dialog.open.mock.lastCall[1].data).toEqual(LOG_GOING_PUBLIC);
      expect(log.update).not.toHaveBeenCalled();

      answer(true);
      component.save();

      expect(log.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ type: LogEntryType.CAPTAIN }),
      );
    });

    it('says so when it cannot be read', () => {
      log.get.mockReturnValue(throwError(() => new Error('offline')));

      const { component } = render('entry-1');

      expect(component.errorMessage()).toBe(LOG_ENTRY_LOAD_FAILED);
      expect(component.isLoading()).toBeFalse();
    });

    it('locks an entry moderators removed, showing their reason', () => {
      log.get.mockReturnValue(
        of(
          entry({
            removedAt: '2026-11-25T08:00:00.000Z',
            removedReason: 'Spoilers',
            pictureUrls: { cover640x360: 'small', cover1920x1080: 'large' },
          }),
        ),
      );

      const { component, element } = render('entry-1');

      expect(component.isRemoved()).toBeTrue();
      expect(component.form.disabled).toBeTrue();
      expect(component.bodyLength()).toBe(28);
      expect(element.textContent).toContain('Spoilers');
      expect(element.textContent).not.toContain('Replace the picture');
      expect(element.querySelector('button[type="submit"]')).toBeNull();
      expect(element.textContent).toContain('Delete');
    });

    it('previews the Markdown on request', () => {
      const { component, fixture, element } = render('entry-1');

      component.togglePreview();
      fixture.detectChanges();

      expect(element.querySelector('.markdown-preview')!.textContent).toContain(
        'Azure Nebula',
      );

      component.togglePreview();
      expect(component.showPreview()).toBeFalse();
    });
  });

  describe('the picture', () => {
    it('opens the cropping dialogue, and reads the entry again once a picture is sent', () => {
      const { component } = render('entry-1');

      component.onSetPicture(entry({ pictureAlt: 'The bridge' }));

      expect(dialog.open).toHaveBeenCalledWith(
        LogPictureDialogComponent,
        expect.objectContaining({
          data: {
            entryId: 'entry-1',
            scopeName: 'Arrival',
            currentAlt: 'The bridge',
          },
        }),
      );
      expect(log.get).toHaveBeenCalledTimes(2);
    });

    it('reads nothing again when the dialogue is closed without a picture', () => {
      const { component } = render('entry-1');

      answer(undefined);
      component.onSetPicture(entry());

      expect(log.get).toHaveBeenCalledTimes(1);
    });

    it('removes the picture once asked, keeping what is typed', () => {
      log.get.mockReturnValue(
        of(
          entry({
            pictureUrls: { cover640x360: 'small', cover1920x1080: 'large' },
            pictureAlt: 'The bridge',
          }),
        ),
      );

      const { component, element } = render('entry-1');

      expect(element.querySelector('.log-entry-picture__image')).not.toBeNull();
      expect(element.textContent).toContain('Remove the picture');

      component.form.patchValue({ body: 'Typed, not saved.' });
      component.onRemovePicture(entry());

      expect(log.removePicture).toHaveBeenCalledWith('entry-1');
      expect(log.get).toHaveBeenCalledTimes(2);
      expect(component.form.controls.body.value).toBe('Typed, not saved.');
    });

    it('says so when the picture cannot be removed', () => {
      log.removePicture.mockReturnValue(throwError(() => new Error('offline')));

      const { component } = render('entry-1');

      component.onRemovePicture(entry());

      expect(component.errorMessage()).toBe(LOG_ENTRY_REMOVE_FAILED);
    });
  });

  describe('deleting', () => {
    it('deletes the entry once asked, and goes back to the Log', () => {
      const { component, navigate } = render('entry-1');

      component.form.markAsDirty();
      component.onDelete(entry());

      expect(log.delete).toHaveBeenCalledWith('entry-1');
      expect(navigate).toHaveBeenCalledWith(['/dashboard/log']);
      expect(component.hasUnsavedChanges()).toBeFalse();
    });

    it('deletes nothing when the author thinks better of it', () => {
      const { component } = render('entry-1');

      answer(false);
      component.onDelete(entry());

      expect(log.delete).not.toHaveBeenCalled();
    });
  });
});
