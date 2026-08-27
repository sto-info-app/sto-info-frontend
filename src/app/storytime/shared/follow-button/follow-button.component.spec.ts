import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FollowTargetKind } from 'src/app/models/storytime.models';
import { FollowService } from '../../follow.service';
import { FollowButtonComponent } from './follow-button.component';

const STORY_ID = 'story-1';

describe('FollowButtonComponent', () => {
  let component: FollowButtonComponent;
  let fixture: ComponentFixture<FollowButtonComponent>;
  let followService: {
    getFollowState: jest.Mock;
    follow: jest.Mock;
    unfollow: jest.Mock;
  };
  let authService: { isLoggedIn: jest.Mock };

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(FollowButtonComponent);
    component = fixture.componentInstance;
    component.kind = FollowTargetKind.STORY;
    component.targetId = STORY_ID;
    component.label = 'this Story';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    followService = {
      getFollowState: jest
        .fn()
        .mockReturnValue(of({ isFollowing: false, followerCount: 3 })),
      follow: jest
        .fn()
        .mockReturnValue(of({ isFollowing: true, followerCount: 4 })),
      unfollow: jest
        .fn()
        .mockReturnValue(of({ isFollowing: false, followerCount: 3 })),
    };
    authService = { isLoggedIn: jest.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [FollowButtonComponent],
      providers: [
        { provide: FollowService, useValue: followService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('reads whether the reader already follows it', () => {
    create();

    expect(followService.getFollowState).toHaveBeenCalledWith(
      FollowTargetKind.STORY,
      STORY_ID,
    );
    expect(fixture.nativeElement.textContent).toContain('Follow this Story');
    expect(fixture.nativeElement.textContent).toContain('3 followers');
  });

  it('says follower in the singular for one', () => {
    followService.getFollowState.mockReturnValue(
      of({ isFollowing: true, followerCount: 1 }),
    );

    create();

    expect(fixture.nativeElement.textContent).toContain('1 follower');
  });

  // A follow only exists for somebody with an account, and a button that
  // always says "sign in first" is a nag rather than a control.
  it('shows nothing to a signed-out reader', () => {
    authService.isLoggedIn.mockReturnValue(false);

    create();

    expect(followService.getFollowState).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('shows nothing when the state cannot be read', () => {
    followService.getFollowState.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.state).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('follows when pressed', () => {
    create();

    fixture.nativeElement.querySelector('button').click();

    expect(followService.follow).toHaveBeenCalledWith(
      FollowTargetKind.STORY,
      STORY_ID,
    );
    expect(component.state?.isFollowing).toBe(true);
  });

  it('stops following when pressed again', () => {
    followService.getFollowState.mockReturnValue(
      of({ isFollowing: true, followerCount: 4 }),
    );

    create();
    component.toggle();

    expect(followService.unfollow).toHaveBeenCalledWith(
      FollowTargetKind.STORY,
      STORY_ID,
    );
  });

  it('ignores a second press while one is in flight', () => {
    create();
    component.isSaving = true;

    component.toggle();

    expect(followService.follow).not.toHaveBeenCalled();
  });

  it('does nothing before the state is known', () => {
    followService.getFollowState.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();
    component.toggle();

    expect(followService.follow).not.toHaveBeenCalled();
  });

  it('reports what the server said', () => {
    followService.follow.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'You cannot follow yourself.' },
          }),
      ),
    );

    create();
    component.toggle();

    expect(component.errorMessage).toBe('You cannot follow yourself.');
    expect(component.isSaving).toBe(false);
  });

  it('falls back to its own wording when the server gives none', () => {
    followService.follow.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();
    component.toggle();

    expect(component.errorMessage).toBe('That could not be saved. Try again.');
  });
});
