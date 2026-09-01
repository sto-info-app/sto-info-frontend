import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedStory, StoryStatus } from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { STORYTIME_COPY } from '../../storytime.constants';
import { StorytimeService } from '../../storytime.service';
import { StoryService } from '../../story.service';
import { StoryEditorComponent } from './story-editor.component';

describe('StoryEditorComponent', () => {
  let fixture: ComponentFixture<StoryEditorComponent>;
  let storyService: {
    getMyStory: jest.Mock;
    createStory: jest.Mock;
    updateStory: jest.Mock;
    publishStory: jest.Mock;
    acceptContentPolicy: jest.Mock;
  };
  let storytimeService: { getLanguages: jest.Mock };
  let arcService: { inviteStory: jest.Mock };
  let router: { navigate: jest.Mock };
  let routeParams: Map<string, string>;
  let queryParams: Map<string, string>;

  const existingStory = {
    id: 'story-1',
    title: 'A Story',
    slug: 'a-story',
    shortDescription: 'A summary',
    description: '# Source',
    contentRating: 'GENERAL',
    status: StoryStatus.DRAFT,
    contentPolicyAcceptedAt: '2026-06-01T00:00:00Z',
    contentPolicyCurrent: true,
    completionState: 'ONGOING',
    visibility: 'PRIVATE',
    languageCode: 'en',
    version: 4,
  } as ManagedStory;

  /**
   * Builds and renders the component.
   */
  const render = (): ComponentFixture<StoryEditorComponent> => {
    fixture = TestBed.createComponent(StoryEditorComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    routeParams = new Map();
    queryParams = new Map();
    storyService = {
      getMyStory: jest.fn().mockReturnValue(of(existingStory)),
      createStory: jest.fn().mockReturnValue(of({ id: 'new-story' })),
      updateStory: jest.fn().mockReturnValue(of(existingStory)),
      publishStory: jest.fn().mockReturnValue(of(existingStory)),
      acceptContentPolicy: jest
        .fn()
        .mockReturnValue(
          of({ ...existingStory, contentPolicyCurrent: true } as ManagedStory),
        ),
    };
    storytimeService = {
      getLanguages: jest
        .fn()
        .mockReturnValue(of([{ code: 'en', name: 'English' }])),
    };
    arcService = {
      inviteStory: jest.fn().mockReturnValue(of([{ id: 'membership-1' }])),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [StoryEditorComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: ArcService, useValue: arcService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: routeParams, queryParamMap: queryParams },
          },
        },
      ],
    });
  });

  describe('creating', () => {
    it('starts with an empty form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(true);
      expect(fixture.componentInstance.form.value.title).toBe('');
      expect(storyService.getMyStory).not.toHaveBeenCalled();
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

      expect(storyService.createStory).not.toHaveBeenCalled();
    });

    it('creates the Story and goes to its editor', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'A New Story' }),
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    // Nothing to publish and nothing to open yet: a Story with no Chapters
    // cannot be published, and a button that could only ever be refused is
    // worse than no button.
    it('offers no publish and no way into the Story', () => {
      const element = render().nativeElement as HTMLElement;

      expect(fixture.componentInstance.canPublish).toBe(false);
      expect(element.textContent).not.toContain('Save and publish');
      expect(element.querySelector('nav')).toBeNull();
    });

    // A new Story has no version to send.
    it('sends no version when creating', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.not.objectContaining({ version: expect.anything() }),
      );
    });
  });

  describe('editing', () => {
    beforeEach(() => {
      routeParams.set('storyId', 'story-1');
    });

    it('loads the Story into the form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(false);
      expect(fixture.componentInstance.form.value.title).toBe('A Story');
      expect(fixture.componentInstance.form.value.description).toBe('# Source');
    });

    // The version goes with the update so a stale edit is refused rather than
    // silently overwriting a change made elsewhere.
    it('sends the version it loaded', () => {
      render();
      fixture.componentInstance.save();

      expect(storyService.updateStory).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ version: 4 }),
      );
    });

    // A Story with no summary or description must load as empty fields, not
    // as the string "null".
    it('loads a Story with no summary or description as blank fields', () => {
      storyService.getMyStory.mockReturnValue(
        of({
          ...existingStory,
          shortDescription: null,
          description: null,
        } as ManagedStory),
      );

      render();

      expect(fixture.componentInstance.form.value.shortDescription).toBe('');
      expect(fixture.componentInstance.form.value.description).toBe('');
    });

    // Artwork is set against the saved Story rather than staged into this
    // form, so there is nothing to offer before the first save.
    it('offers no artwork until the Story exists', () => {
      routeParams.delete('storyId');
      render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'app-storytime-image-manager',
        ),
      ).toBeNull();
    });

    it('offers both artwork slots once it does', () => {
      render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          'app-storytime-image-manager',
        ),
      ).toHaveLength(2);
    });

    // Setting a picture moves the version on, so an editor still holding the
    // old one would have its next save refused as stale.
    it('keeps the Story the artwork panel hands back, version and all', () => {
      render();

      fixture.componentInstance.onImageChanged({
        ...existingStory,
        version: 5,
        bannerImageUrl: 'https://images.example/banner',
        bannerImageAlt: 'The USS Ares at warp',
      } as ManagedStory);
      fixture.detectChanges();

      expect(fixture.componentInstance.form.value.bannerImageAlt).toBe(
        'The USS Ares at warp',
      );

      fixture.componentInstance.save();

      expect(storyService.updateStory).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ version: 5 }),
      );
    });

    // A description of an empty slot would be stored against nothing and read
    // out over whatever was uploaded into it next, which the server refuses.
    it('says nothing about artwork the Story does not have', () => {
      render();
      fixture.componentInstance.save();

      expect(storyService.updateStory).toHaveBeenCalledWith(
        'story-1',
        expect.not.objectContaining({
          bannerImageAlt: expect.anything(),
        }),
      );
    });

    it('reports a Story it could not load', () => {
      storyService.getMyStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });

    // The server names the specific problem, which is more use than a generic
    // failure would be.
    it('shows the reason the server refused a save', () => {
      storyService.updateStory.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'This Story has changed since you loaded it.' },
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

    // Writing is the next thing a creator wants after describing a Story, and
    // the list they came through is not where they get to it.
    it('opens the rest of the Story from here', () => {
      const element = render().nativeElement as HTMLElement;
      const links = [...element.querySelectorAll('nav a')].map(
        link => link.textContent?.trim() ?? '',
      );

      expect(links).toContain('Chapters');
      expect(links).toContain('Cast');
      expect(links).toContain('Collaborators');
    });

    // Publishing what is on the screen means saving it first: a creator who
    // presses Publish after typing expects what they typed to be what goes out.
    it('saves before publishing, then returns to the list', () => {
      render();
      fixture.componentInstance.publish();

      expect(storyService.updateStory).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ version: 4 }),
      );
      expect(storyService.publishStory).toHaveBeenCalledWith('story-1');
      expect(router.navigate).toHaveBeenCalledWith([
        '/',
        'storytime',
        'manage',
        'stories',
      ]);
    });

    // A refused publish names what the Story is still missing, which is the
    // whole use of it, and leaves the creator on the page to put it right.
    it('shows why the server refused a publish', () => {
      storyService.publishStory.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'This Story has no published Chapter.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.publish();

      expect(fixture.componentInstance.errorMessage).toContain(
        'no published Chapter',
      );
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('offers no publish for a Story that is already published', () => {
      storyService.getMyStory.mockReturnValue(
        of({ ...existingStory, status: StoryStatus.PUBLISHED } as ManagedStory),
      );

      const element = render().nativeElement as HTMLElement;

      expect(fixture.componentInstance.canPublish).toBe(false);
      expect(element.textContent).not.toContain('Save and publish');
    });

    // The terms are confirmed where the publish that needs them is pressed,
    // rather than sending a refused creator elsewhere to find them.
    it('asks for the publishing terms here when they are outstanding', () => {
      storyService.getMyStory.mockReturnValue(
        of({
          ...existingStory,
          contentPolicyAcceptedAt: null,
          contentPolicyCurrent: false,
        } as ManagedStory),
      );

      const element = render().nativeElement as HTMLElement;

      expect(element.textContent).toContain(
        STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT,
      );
    });

    it('stops asking once the terms have been confirmed', () => {
      storyService.getMyStory.mockReturnValue(
        of({
          ...existingStory,
          contentPolicyAcceptedAt: null,
          contentPolicyCurrent: false,
        } as ManagedStory),
      );

      const element = render().nativeElement as HTMLElement;
      const confirm = [...element.querySelectorAll('button')].find(button =>
        button.textContent?.includes('I confirm'),
      );

      confirm?.click();
      fixture.detectChanges();

      expect(storyService.acceptContentPolicy).toHaveBeenCalledWith('story-1');
      expect(element.textContent).not.toContain(
        STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT,
      );
    });

    it('falls back to a generic message when the server gives none', () => {
      storyService.updateStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });
  });
  // An Arc is often the reason a Story gets written at all, so writing one can
  // start from the Arc rather than from the list of somebody's own work.
  describe('writing for an Arc', () => {
    beforeEach(() => {
      queryParams.set('arc', 'arc-1');
    });

    it('says the Story will join the Arc', () => {
      const element = render().nativeElement as HTMLElement;

      expect(fixture.componentInstance.isJoiningArc).toBe(true);
      expect(element.textContent).toContain('joins the Arc you came from');
    });

    // Straight to the Chapters, because somebody who has just described a
    // Story wants to write it rather than be returned to admire the title.
    it('joins the Arc on the first save and opens the Chapters', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(arcService.inviteStory).toHaveBeenCalledWith('arc-1', 'new-story');
      expect(router.navigate).toHaveBeenCalledWith([
        '/',
        'storytime',
        'manage',
        'stories',
        'new-story',
        'chapters',
      ]);
    });

    // The Story exists whatever the Arc says next, so the editor holds on to
    // it: offering to create a second one would be the worst answer available.
    it('keeps the created Story when it could not join', () => {
      arcService.inviteStory.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'You do not curate this Arc.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'do not curate this Arc',
      );
      expect(fixture.componentInstance.isNew).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    // An existing Story reached with the parameter still on the address is
    // already somewhere; it is not joined again behind its owner's back.
    it('leaves an existing Story alone', () => {
      routeParams.set('storyId', 'story-1');

      render();
      fixture.componentInstance.save();

      expect(arcService.inviteStory).not.toHaveBeenCalled();
    });
  });
});
