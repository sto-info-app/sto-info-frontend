import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReactionSummary,
  StorytimeReaction,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReactionService } from '../../reaction.service';
import { ReactionControlComponent } from './reaction-control.component';

const STORY_ID = 'story-1';

/**
 * Builds a summary.
 *
 * @param overrides - What differs from three up, one down, none of them mine.
 * @returns The summary.
 */
const buildSummary = (
  overrides: Partial<ReactionSummary> = {},
): ReactionSummary => ({
  targetId: STORY_ID,
  upVotes: 3,
  downVotes: 1,
  rating: 2,
  mine: null,
  ...overrides,
});

describe('ReactionControlComponent', () => {
  let component: ReactionControlComponent;
  let fixture: ComponentFixture<ReactionControlComponent>;
  let reactionService: {
    getSummary: jest.Mock;
    react: jest.Mock;
    removeReaction: jest.Mock;
  };
  let authService: { isLoggedIn: jest.Mock };

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(ReactionControlComponent);
    component = fixture.componentInstance;
    component.targetType = StorytimeTargetType.STORY;
    component.targetId = STORY_ID;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    reactionService = {
      getSummary: jest.fn().mockReturnValue(of(buildSummary())),
      react: jest
        .fn()
        .mockReturnValue(
          of(buildSummary({ mine: StorytimeReaction.THUMBS_UP, upVotes: 4 })),
        ),
      removeReaction: jest.fn().mockReturnValue(of(buildSummary())),
    };
    authService = { isLoggedIn: jest.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [ReactionControlComponent],
      providers: [
        { provide: ReactionService, useValue: reactionService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('shows how the thing stands', () => {
    create();

    const text = fixture.nativeElement.textContent as string;

    expect(reactionService.getSummary).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
    );
    expect(text).toContain('3');
    expect(text).toContain('1');
  });

  it('shows nothing when the counts cannot be read', () => {
    reactionService.getSummary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.summary).toBeNull();
  });

  it('records a thumbs up', () => {
    create();

    component.react(StorytimeReaction.THUMBS_UP);

    expect(reactionService.react).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
      StorytimeReaction.THUMBS_UP,
    );
    expect(component.summary?.mine).toBe(StorytimeReaction.THUMBS_UP);
  });

  // Pressing what is already pressed is what taking it back looks like.
  it('takes back the reaction already left', () => {
    reactionService.getSummary.mockReturnValue(
      of(buildSummary({ mine: StorytimeReaction.THUMBS_UP })),
    );

    create();
    component.react(StorytimeReaction.THUMBS_UP);

    expect(reactionService.removeReaction).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
    );
    expect(reactionService.react).not.toHaveBeenCalled();
  });

  it('changes a thumbs up to a thumbs down', () => {
    reactionService.getSummary.mockReturnValue(
      of(buildSummary({ mine: StorytimeReaction.THUMBS_UP })),
    );

    create();
    component.react(StorytimeReaction.THUMBS_DOWN);

    expect(reactionService.react).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
      StorytimeReaction.THUMBS_DOWN,
    );
  });

  // Hiding the buttons would make the number look like a fact about the page
  // rather than something readers decide.
  it('shows the rating to a signed-out reader but will not change it', () => {
    authService.isLoggedIn.mockReturnValue(false);

    create();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );

    expect(buttons).toHaveLength(2);
    expect(buttons.every(button => button.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Sign in to rate this');
  });

  it('does nothing when a signed-out reader presses anyway', () => {
    authService.isLoggedIn.mockReturnValue(false);

    create();
    component.react(StorytimeReaction.THUMBS_UP);

    expect(reactionService.react).not.toHaveBeenCalled();
  });

  it('ignores a second press while one is in flight', () => {
    create();
    component.isSaving = true;

    component.react(StorytimeReaction.THUMBS_UP);

    expect(reactionService.react).not.toHaveBeenCalled();
  });

  it('reports what the server said when a reaction fails', () => {
    reactionService.react.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'You cannot rate your own Story.' },
          }),
      ),
    );

    create();
    component.react(StorytimeReaction.THUMBS_UP);

    expect(component.errorMessage).toBe('You cannot rate your own Story.');
    expect(component.isSaving).toBe(false);
  });

  it('falls back to its own wording when the server gives none', () => {
    reactionService.react.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();
    component.react(StorytimeReaction.THUMBS_UP);

    expect(component.errorMessage).toBe(
      'That could not be recorded. Try again.',
    );
  });

  it('reacts when the button is pressed', () => {
    create();

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button');
    button.click();

    expect(reactionService.react).toHaveBeenCalled();
  });
});
