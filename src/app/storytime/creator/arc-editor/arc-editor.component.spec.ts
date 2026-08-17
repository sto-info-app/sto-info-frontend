import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ManagedArc,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { StorytimeService } from '../../storytime.service';
import { ArcEditorComponent } from './arc-editor.component';

describe('ArcEditorComponent', () => {
  let fixture: ComponentFixture<ArcEditorComponent>;
  let arcService: {
    getMyArc: jest.Mock;
    createArc: jest.Mock;
    updateArc: jest.Mock;
  };
  let storytimeService: { getLanguages: jest.Mock };
  let router: { navigate: jest.Mock };
  let routeParams: Map<string, string>;

  const existingArc = {
    id: 'arc-1',
    title: 'The Long War',
    slug: 'the-long-war',
    shortDescription: 'A summary',
    description: '# Source',
    visibility: StorytimeVisibility.PRIVATE,
    languageCode: 'en',
    version: 4,
  } as ManagedArc;

  /**
   * Builds and renders the component.
   */
  const render = (): void => {
    fixture = TestBed.createComponent(ArcEditorComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    routeParams = new Map();
    arcService = {
      getMyArc: jest.fn().mockReturnValue(of(existingArc)),
      createArc: jest.fn().mockReturnValue(of({ id: 'new-arc' })),
      updateArc: jest.fn().mockReturnValue(of(existingArc)),
    };
    storytimeService = {
      getLanguages: jest
        .fn()
        .mockReturnValue(of([{ code: 'en', name: 'English' }])),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ArcEditorComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  describe('creating', () => {
    it('starts with an empty form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(true);
      expect(fixture.componentInstance.form.value.title).toBe('');
      expect(arcService.getMyArc).not.toHaveBeenCalled();
    });

    it('offers the languages the server accepts', () => {
      render();

      expect(fixture.componentInstance.languages).toEqual([
        { code: 'en', name: 'English' },
      ]);
    });

    it('refuses to save without a title', () => {
      render();
      fixture.componentInstance.save();

      expect(arcService.createArc).not.toHaveBeenCalled();
    });

    // A new Arc has nothing in it, so the next thing to do is fill it.
    it('creates the Arc and goes on to choosing its Stories', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Arc' });
      fixture.componentInstance.save();

      expect(arcService.createArc).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'A New Arc' }),
      );
      expect(router.navigate).toHaveBeenCalledWith(
        expect.arrayContaining(['new-arc', 'stories']),
      );
    });

    it('sends no version when creating', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Arc' });
      fixture.componentInstance.save();

      expect(arcService.createArc).toHaveBeenCalledWith(
        expect.not.objectContaining({ version: expect.anything() }),
      );
    });

    it('explains what the chosen visibility means', () => {
      render();

      expect(fixture.componentInstance.visibilityDescription).toContain(
        'only by you',
      );
    });
  });

  describe('editing', () => {
    beforeEach(() => {
      routeParams.set('arcId', 'arc-1');
    });

    it('loads the Arc into the form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(false);
      expect(fixture.componentInstance.form.value.title).toBe('The Long War');
      expect(fixture.componentInstance.form.value.description).toBe('# Source');
    });

    // The version goes with the update so a stale edit is refused rather than
    // silently overwriting a co-curator's change.
    it('sends the version it loaded', () => {
      render();
      fixture.componentInstance.save();

      expect(arcService.updateArc).toHaveBeenCalledWith(
        'arc-1',
        expect.objectContaining({ version: 4 }),
      );
    });

    it('loads an Arc with no summary or description as blank fields', () => {
      arcService.getMyArc.mockReturnValue(
        of({
          ...existingArc,
          shortDescription: null,
          description: null,
        } as ManagedArc),
      );

      render();

      expect(fixture.componentInstance.form.value.shortDescription).toBe('');
      expect(fixture.componentInstance.form.value.description).toBe('');
    });

    it('reports an Arc it could not load', () => {
      arcService.getMyArc.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });

    it('shows the reason the server refused a save', () => {
      arcService.updateArc.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'This Arc has changed since you loaded it.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'changed since you loaded it',
      );
      expect(fixture.componentInstance.isSaving).toBe(false);
    });

    it('falls back to a generic message when the server gives none', () => {
      arcService.updateArc.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });

    // A second click while the first save is in flight would create a second
    // Arc, or race two edits against the same version.
    it('ignores a second save while one is in flight', () => {
      render();
      fixture.componentInstance.isSaving = true;
      fixture.componentInstance.save();

      expect(arcService.updateArc).not.toHaveBeenCalled();
    });
  });
});
