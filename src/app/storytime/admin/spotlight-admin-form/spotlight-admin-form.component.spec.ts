import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ManagedSpotlight,
  SpotlightEntityType,
} from 'src/app/models/storytime.models';
import { SpotlightService } from '../../spotlight.service';
import { SpotlightAdminFormComponent } from './spotlight-admin-form.component';

describe('SpotlightAdminFormComponent', () => {
  let fixture: ComponentFixture<SpotlightAdminFormComponent>;
  let spotlightService: {
    getOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let router: { navigate: jest.Mock };
  let routeParams: Map<string, string>;

  const existingEntry = {
    id: 'spotlight-1',
    slug: 'a-fine-story',
    entityType: SpotlightEntityType.STORY,
    storyId: 'story-1',
    arcId: null,
    headline: 'Start here',
    summary: 'Worth your evening.',
    selectionReason: 'It stayed with us.',
    overrideImageId: null,
    overrideImageAlt: null,
    displayPriority: 5,
    isPublished: false,
    startsAt: '2026-06-01T00:00:00.000Z',
    endsAt: null,
  } as ManagedSpotlight;

  /**
   * Builds and renders the component.
   */
  const render = (): void => {
    fixture = TestBed.createComponent(SpotlightAdminFormComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    routeParams = new Map();
    spotlightService = {
      getOne: jest.fn().mockReturnValue(of(existingEntry)),
      create: jest.fn().mockReturnValue(of({ id: 'new-spotlight' })),
      update: jest.fn().mockReturnValue(of(existingEntry)),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SpotlightAdminFormComponent],
      providers: [
        provideRouter([]),
        { provide: SpotlightService, useValue: spotlightService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  describe('drafting', () => {
    it('starts with an empty form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(true);
      expect(spotlightService.getOne).not.toHaveBeenCalled();
    });

    it('refuses to save an incomplete selection', () => {
      render();
      fixture.componentInstance.save();

      expect(spotlightService.create).not.toHaveBeenCalled();
    });

    it('drafts a selection featuring a Story', () => {
      render();
      fixture.componentInstance.form.patchValue({
        entityType: SpotlightEntityType.STORY,
        targetId: ' story-1 ',
        headline: 'Start here',
        summary: 'Worth your evening.',
        startsAt: '2026-06-01T00:00',
      });
      fixture.componentInstance.save();

      expect(spotlightService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: SpotlightEntityType.STORY,
          storyId: 'story-1',
          arcId: undefined,
          headline: 'Start here',
        }),
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    it('drafts a selection featuring an Arc', () => {
      render();
      fixture.componentInstance.form.patchValue({
        entityType: SpotlightEntityType.ARC,
        targetId: 'arc-1',
        headline: 'Start here',
        summary: 'Worth your evening.',
        startsAt: '2026-06-01T00:00',
      });
      fixture.componentInstance.save();

      expect(spotlightService.create).toHaveBeenCalledWith(
        expect.objectContaining({ arcId: 'arc-1', storyId: undefined }),
      );
    });

    it('names the identifier field after the kind of work chosen', () => {
      render();

      expect(fixture.componentInstance.targetLabel).toBe('Story ID');

      fixture.componentInstance.form.patchValue({
        entityType: SpotlightEntityType.ARC,
      });

      expect(fixture.componentInstance.targetLabel).toBe('Arc ID');
    });

    // Clearing a field means "there is none", not "there is one, and it is
    // blank".
    it('sends nothing rather than empty text', () => {
      render();
      fixture.componentInstance.form.patchValue({
        targetId: 'story-1',
        headline: 'Start here',
        summary: 'Worth your evening.',
        startsAt: '2026-06-01T00:00',
      });
      fixture.componentInstance.save();

      expect(spotlightService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          selectionReason: null,
          overrideImageId: null,
          overrideImageAlt: null,
          slug: undefined,
          endsAt: null,
        }),
      );
    });

    // The editor types their own wall-clock time; the server is told the
    // instant that names.
    it('sends the period an editor chose as an instant', () => {
      render();
      fixture.componentInstance.form.patchValue({
        targetId: 'story-1',
        headline: 'Start here',
        summary: 'Worth your evening.',
        startsAt: '2026-06-01T09:00',
        endsAt: '2026-06-08T09:00',
      });
      fixture.componentInstance.save();

      const sent = spotlightService.create.mock.calls[0][0] as {
        startsAt: string;
        endsAt: string;
      };

      expect(sent.startsAt).toBe(new Date('2026-06-01T09:00').toISOString());
      expect(sent.endsAt).toBe(new Date('2026-06-08T09:00').toISOString());
    });
  });

  describe('editing', () => {
    beforeEach(() => {
      routeParams.set('spotlightId', 'spotlight-1');
    });

    it('loads the selection into the form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(false);
      expect(fixture.componentInstance.form.getRawValue().headline).toBe(
        'Start here',
      );
      expect(fixture.componentInstance.form.getRawValue().targetId).toBe(
        'story-1',
      );
    });

    // Repointing a live selection would keep words that praised something else.
    it('fixes what the selection features', () => {
      render();

      expect(
        fixture.componentInstance.form.controls['entityType'].disabled,
      ).toBe(true);
      expect(fixture.componentInstance.form.controls['targetId'].disabled).toBe(
        true,
      );
    });

    it('loads an Arc selection’s identifier', () => {
      spotlightService.getOne.mockReturnValue(
        of({
          ...existingEntry,
          entityType: SpotlightEntityType.ARC,
          storyId: null,
          arcId: 'arc-1',
        } as ManagedSpotlight),
      );

      render();

      expect(fixture.componentInstance.form.getRawValue().targetId).toBe(
        'arc-1',
      );
    });

    it('loads a selection with no optional text as blank fields', () => {
      spotlightService.getOne.mockReturnValue(
        of({ ...existingEntry, selectionReason: null } as ManagedSpotlight),
      );

      render();

      expect(fixture.componentInstance.form.getRawValue().selectionReason).toBe(
        '',
      );
    });

    it('leaves an open-ended period blank', () => {
      render();

      expect(fixture.componentInstance.form.getRawValue().endsAt).toBe('');
    });

    // Formatting the input as UTC would move every schedule by the offset each
    // time an editor saved without touching the dates.
    it('loads the period in the editor’s own time, unchanged by saving it', () => {
      render();
      fixture.componentInstance.save();

      const sent = spotlightService.update.mock.calls[0][1] as {
        startsAt: string;
      };

      expect(sent.startsAt).toBe(existingEntry.startsAt);
    });

    it('saves the changes without the target', () => {
      render();
      fixture.componentInstance.form.patchValue({ headline: 'Read this' });
      fixture.componentInstance.save();

      expect(spotlightService.update).toHaveBeenCalledWith(
        'spotlight-1',
        expect.objectContaining({ headline: 'Read this' }),
      );
      expect(spotlightService.update).toHaveBeenCalledWith(
        'spotlight-1',
        expect.not.objectContaining({ entityType: expect.anything() }),
      );
    });

    it('reports a selection it could not load', () => {
      spotlightService.getOne.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });

    it('shows the reason the server refused a save', () => {
      spotlightService.update.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'A Spotlight entry must end after it starts.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'must end after it starts',
      );
      expect(fixture.componentInstance.isSaving).toBe(false);
    });

    it('falls back to a generic message when the server gives none', () => {
      spotlightService.update.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });

    it('ignores a second save while one is in flight', () => {
      render();
      fixture.componentInstance.isSaving = true;
      fixture.componentInstance.save();

      expect(spotlightService.update).not.toHaveBeenCalled();
    });
  });
});
