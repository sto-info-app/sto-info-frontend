import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ManagedSpotlight,
  SearchHit,
  SpotlightEntityType,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { SearchService } from '../../search.service';
import { SpotlightService } from '../../spotlight.service';
import { SpotlightAdminFormComponent } from './spotlight-admin-form.component';

describe('SpotlightAdminFormComponent', () => {
  let fixture: ComponentFixture<SpotlightAdminFormComponent>;
  let spotlightService: {
    getOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let searchService: { search: jest.Mock };
  let dialog: { open: jest.Mock };
  let dialogRef: { afterClosed: jest.Mock };
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
    dialogRef = {
      afterClosed: jest.fn().mockReturnValue(of(undefined)),
    };
    dialog = {
      open: jest.fn().mockReturnValue(dialogRef),
    };
    searchService = {
      search: jest
        .fn()
        .mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 5 })),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SpotlightAdminFormComponent],
      providers: [
        provideRouter([]),
        { provide: SpotlightService, useValue: spotlightService },
        { provide: SearchService, useValue: searchService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    }).overrideComponent(SpotlightAdminFormComponent, {
      remove: { imports: [MatDialogModule] },
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
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

    it('names the field after the kind of work chosen', () => {
      render();

      expect(fixture.componentInstance.targetLabel).toBe('Featured Story');

      fixture.componentInstance.form.patchValue({
        entityType: SpotlightEntityType.ARC,
      });

      expect(fixture.componentInstance.targetLabel).toBe('Featured Arc');
    });

    // An editor chooses work by name. The identifier stays in the form, where
    // it is sent from, and off the screen.
    it('shows the chosen work by name and not by identifier', () => {
      render();
      fixture.componentInstance.form.controls['targetId'].setValue('story-1');
      fixture.componentInstance.selectedTitle = 'A Fine Story';
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).querySelector(
        '.field-picker',
      )?.textContent;

      expect(text).toContain('A Fine Story');
      expect(text).not.toContain('story-1');
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
          slug: undefined,
          endsAt: null,
        }),
      );
    });

    // A new entry has no artwork yet — it is uploaded against the saved entry
    // — so there is nothing to describe and the server refuses a description
    // of an empty slot.
    it('says nothing about artwork on a new entry', () => {
      render();
      fixture.componentInstance.form.patchValue({
        targetId: 'story-1',
        headline: 'Start here',
        summary: 'Worth your evening.',
        startsAt: '2026-06-01T00:00',
        overrideImageAlt: 'A fleet at anchor',
      });
      fixture.componentInstance.save();

      expect(spotlightService.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          overrideImageAlt: expect.anything(),
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

    describe('search and select picker', () => {
      it('opens picker dialog with Story configuration by default', () => {
        render();
        fixture.componentInstance.openPicker();

        expect(dialog.open).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Select a Story',
              pageSize: 5,
            }),
          }),
        );
      });

      it('opens picker dialog with Arc configuration when entityType is ARC', () => {
        render();
        fixture.componentInstance.form.patchValue({
          entityType: SpotlightEntityType.ARC,
        });
        fixture.componentInstance.openPicker();

        expect(dialog.open).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Select an Arc',
              pageSize: 5,
            }),
          }),
        );
      });

      it('calls searchService with Story type inside searchFn', () => {
        render();
        fixture.componentInstance.openPicker();

        const openedData = dialog.open.mock.calls[0][1].data;
        openedData.searchFn('voyager', 2);

        expect(searchService.search).toHaveBeenCalledWith('voyager', {
          types: [StorytimeTargetType.STORY],
          page: 2,
          pageSize: 5,
        });
        const testHit: SearchHit = {
          id: 's1',
          slug: 's1',
          title: 'T',
          summary: 'S',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        expect(openedData.resultLabel(testHit)).toBe('T');
        expect(openedData.resultSublabel(testHit)).toBe('S');
      });

      it('calls searchService with Arc type inside searchFn when entityType is ARC', () => {
        render();
        fixture.componentInstance.form.patchValue({
          entityType: SpotlightEntityType.ARC,
        });
        fixture.componentInstance.openPicker();

        const openedData = dialog.open.mock.calls[0][1].data;
        openedData.searchFn('dominion', 1);

        expect(searchService.search).toHaveBeenCalledWith('dominion', {
          types: [StorytimeTargetType.ARC],
          page: 1,
          pageSize: 5,
        });
      });

      it('patches targetId and selectedTitle when a hit is chosen', () => {
        const hit: SearchHit = {
          id: 'story-123',
          slug: 'story-slug',
          title: 'The Search for Spock',
          summary: 'A thrilling tale',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        dialogRef.afterClosed.mockReturnValue(of(hit));

        render();
        fixture.componentInstance.openPicker();

        expect(fixture.componentInstance.form.controls['targetId'].value).toBe(
          'story-123',
        );
        expect(fixture.componentInstance.selectedTitle).toBe(
          'The Search for Spock',
        );
      });

      // An editor starts from what the work already says rather than a blank
      // page.
      it('fills the headline and summary in from the chosen work', () => {
        const hit: SearchHit = {
          id: 'story-123',
          slug: 'story-slug',
          title: 'The Search for Spock',
          summary: 'A thrilling tale',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        dialogRef.afterClosed.mockReturnValue(of(hit));

        render();
        fixture.componentInstance.openPicker();

        expect(fixture.componentInstance.form.getRawValue().headline).toBe(
          'The Search for Spock',
        );
        expect(fixture.componentInstance.form.getRawValue().summary).toBe(
          'A thrilling tale',
        );
      });

      it('fills an empty summary in as nothing when the work has none', () => {
        const hit: SearchHit = {
          id: 'story-123',
          slug: 'story-slug',
          title: 'The Search for Spock',
          summary: null,
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        dialogRef.afterClosed.mockReturnValue(of(hit));

        render();
        fixture.componentInstance.openPicker();

        expect(fixture.componentInstance.form.getRawValue().summary).toBe('');
      });

      // The seed saves typing; it does not overwrite it.
      it('keeps words the editor wrote when the selection changes', () => {
        const first: SearchHit = {
          id: 'story-1',
          slug: 'first',
          title: 'The Search for Spock',
          summary: 'A thrilling tale',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        const second: SearchHit = {
          id: 'story-2',
          slug: 'second',
          title: 'The Voyage Home',
          summary: 'Whales, mostly.',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        dialogRef.afterClosed.mockReturnValue(of(first));

        render();
        fixture.componentInstance.openPicker();
        fixture.componentInstance.form.controls['headline'].setValue(
          'Our pick of the month',
        );
        dialogRef.afterClosed.mockReturnValue(of(second));
        fixture.componentInstance.openPicker();

        // The headline was theirs; the summary was still the last seed.
        expect(fixture.componentInstance.form.getRawValue().headline).toBe(
          'Our pick of the month',
        );
        expect(fixture.componentInstance.form.getRawValue().summary).toBe(
          'Whales, mostly.',
        );
      });

      it('clears seeded details when entityType changes', () => {
        const hit: SearchHit = {
          id: 'story-1',
          slug: 'first',
          title: 'The Search for Spock',
          summary: 'A thrilling tale',
          storySlug: null,
          targetType: StorytimeTargetType.STORY,
        };
        dialogRef.afterClosed.mockReturnValue(of(hit));

        render();
        fixture.componentInstance.openPicker();
        fixture.componentInstance.form.controls['entityType'].setValue(
          SpotlightEntityType.ARC,
        );

        expect(fixture.componentInstance.form.getRawValue().headline).toBe('');
        expect(fixture.componentInstance.form.getRawValue().summary).toBe('');
      });

      it('leaves form unchanged when picker is cancelled', () => {
        dialogRef.afterClosed.mockReturnValue(of(undefined));

        render();
        fixture.componentInstance.form.controls['targetId'].setValue(
          'story-old',
        );
        fixture.componentInstance.selectedTitle = 'Old Title';
        fixture.componentInstance.openPicker();

        expect(fixture.componentInstance.form.controls['targetId'].value).toBe(
          'story-old',
        );
        expect(fixture.componentInstance.selectedTitle).toBe('Old Title');
      });

      it('clears targetId and selectedTitle when entityType changes', () => {
        render();
        fixture.componentInstance.form.controls['targetId'].setValue('story-1');
        fixture.componentInstance.selectedTitle = 'Some Story';

        fixture.componentInstance.form.controls['entityType'].setValue(
          SpotlightEntityType.ARC,
        );

        expect(fixture.componentInstance.form.controls['targetId'].value).toBe(
          '',
        );
        expect(fixture.componentInstance.selectedTitle).toBe('');
      });
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

    // The artwork is set against the saved entry rather than staged into this
    // form, so there is nothing to offer before the first save.
    it('offers artwork once the entry exists', () => {
      render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'app-storytime-image-manager',
        ),
      ).not.toBeNull();
    });

    it('keeps the entry the artwork panel hands back', () => {
      render();

      fixture.componentInstance.onImageChanged({
        ...existingEntry,
        overrideImageUrl: 'https://images.example/spotlight',
        overrideImageAlt: 'A fleet at anchor',
      } as unknown as ManagedSpotlight);

      expect(fixture.componentInstance.hasArtwork).toBe(true);

      fixture.componentInstance.save();

      expect(spotlightService.update).toHaveBeenCalledWith(
        'spotlight-1',
        expect.objectContaining({ overrideImageAlt: 'A fleet at anchor' }),
      );
    });

    it('empties the wording when the new artwork carries none', () => {
      render();

      fixture.componentInstance.onImageChanged({
        ...existingEntry,
        overrideImageUrl: 'https://images.example/spotlight',
        overrideImageAlt: null,
      } as unknown as ManagedSpotlight);

      expect(
        fixture.componentInstance.form.getRawValue().overrideImageAlt,
      ).toBe('');
    });

    // A description of an empty slot would be stored against nothing and read
    // out over whatever was uploaded into it next, which the server refuses.
    it('says nothing about artwork the entry does not have', () => {
      render();
      fixture.componentInstance.form.patchValue({
        overrideImageAlt: 'A fleet at anchor',
      });
      fixture.componentInstance.save();

      expect(spotlightService.update).toHaveBeenCalledWith(
        'spotlight-1',
        expect.not.objectContaining({
          overrideImageAlt: expect.anything(),
        }),
      );
    });

    // The server resolves what an entry features, so an editor reads the name
    // of the work rather than the identifier behind it.
    it('shows the name of the Story a selection features', () => {
      spotlightService.getOne.mockReturnValue(
        of({
          ...existingEntry,
          story: { title: 'A Fine Story' },
        } as unknown as ManagedSpotlight),
      );

      render();

      expect(fixture.componentInstance.selectedTitle).toBe('A Fine Story');
    });

    it('shows the name of the Arc a selection features', () => {
      spotlightService.getOne.mockReturnValue(
        of({
          ...existingEntry,
          entityType: SpotlightEntityType.ARC,
          storyId: null,
          arcId: 'arc-1',
          arc: { title: 'The Long War' },
        } as unknown as ManagedSpotlight),
      );

      render();

      expect(fixture.componentInstance.selectedTitle).toBe('The Long War');
    });

    // The entry an editor most needs to find is the one whose work has gone.
    it('leaves the name empty when the work can no longer be shown', () => {
      render();

      expect(fixture.componentInstance.selectedTitle).toBe('');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Work that can no longer be shown',
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
