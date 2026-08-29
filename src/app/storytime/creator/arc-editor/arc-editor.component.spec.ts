import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ArcStatus,
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
    publishArc: jest.Mock;
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
    status: ArcStatus.DRAFT,
    visibility: StorytimeVisibility.PRIVATE,
    languageCode: 'en',
    version: 4,
  } as ManagedArc;

  /**
   * Builds and renders the component.
   */
  const render = (): ComponentFixture<ArcEditorComponent> => {
    fixture = TestBed.createComponent(ArcEditorComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    routeParams = new Map();
    arcService = {
      getMyArc: jest.fn().mockReturnValue(of(existingArc)),
      createArc: jest.fn().mockReturnValue(of({ id: 'new-arc' })),
      updateArc: jest.fn().mockReturnValue(of(existingArc)),
      publishArc: jest.fn().mockReturnValue(of(existingArc)),
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
    // Nothing to publish and nothing to curate yet, so neither is offered.
    it('offers no publish and no way into the Arc', () => {
      const element = render().nativeElement as HTMLElement;

      expect(fixture.componentInstance.canPublish).toBe(false);
      expect(element.textContent).not.toContain('Save and publish');
      expect(element.querySelector('nav')).toBeNull();
    });

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

    it('explains what every visibility means', () => {
      render();

      expect(
        fixture.componentInstance.visibilityOptions.map(
          option => option.description,
        ),
      ).toContain('Readable only by you.');
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

    // Gathering Stories is what an Arc is for, and the list a curator came
    // through is not where they get to it.
    it('opens the rest of the Arc from here', () => {
      const element = render().nativeElement as HTMLElement;
      const links = [...element.querySelectorAll('nav a')].map(
        link => link.textContent?.trim() ?? '',
      );

      expect(links).toContain('Stories');
      expect(links).toContain('Collaborators');
    });

    // Publishing what is on the screen means saving it first.
    it('saves before publishing, then returns to the list', () => {
      render();
      fixture.componentInstance.publish();

      expect(arcService.updateArc).toHaveBeenCalledWith(
        'arc-1',
        expect.objectContaining({ version: 4 }),
      );
      expect(arcService.publishArc).toHaveBeenCalledWith('arc-1');
      expect(router.navigate).toHaveBeenCalledWith([
        '/',
        'storytime',
        'manage',
        'arcs',
      ]);
    });

    // An Arc still needs an agreed Story in it, which is the server's to say
    // and worth repeating in its own words.
    it('shows why the server refused a publish', () => {
      arcService.publishArc.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'This Arc has no Stories in it.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.publish();

      expect(fixture.componentInstance.errorMessage).toContain(
        'no Stories in it',
      );
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('offers no publish for an Arc that is already published', () => {
      arcService.getMyArc.mockReturnValue(
        of({ ...existingArc, status: ArcStatus.PUBLISHED } as ManagedArc),
      );

      const element = render().nativeElement as HTMLElement;

      expect(fixture.componentInstance.canPublish).toBe(false);
      expect(element.textContent).not.toContain('Save and publish');
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
