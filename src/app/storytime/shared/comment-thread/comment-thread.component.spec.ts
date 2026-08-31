import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import {
  StorytimeComment,
  StorytimeCommentStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { CommentService } from '../../comment.service';
import { CommentThreadComponent } from './comment-thread.component';

const STORY_ID = 'story-1';
const READER_ID = 'reader-1';

/**
 * Builds a comment.
 *
 * @param overrides - What differs from a visible top-level comment by the
 *   signed-in reader.
 * @returns The comment.
 */
const buildComment = (
  overrides: Partial<StorytimeComment> = {},
): StorytimeComment => ({
  id: 'comment-1',
  authorUserId: READER_ID,
  author: { username: 'captain.picard', publiclyVisible: true },
  parentCommentId: null,
  body: 'A fine chapter.',
  status: StorytimeCommentStatus.VISIBLE,
  editedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('CommentThreadComponent', () => {
  let component: CommentThreadComponent;
  let fixture: ComponentFixture<CommentThreadComponent>;
  let commentService: {
    getComments: jest.Mock;
    postComment: jest.Mock;
    updateComment: jest.Mock;
    deleteComment: jest.Mock;
    hideComment: jest.Mock;
    unhideComment: jest.Mock;
    removeComment: jest.Mock;
  };
  let authService: {
    isLoggedIn: jest.Mock;
    isLoggedInAsAdmin: jest.Mock;
    getUserId: jest.Mock;
  };
  let accessControlService: { hasPermission: jest.Mock };

  /**
   * Makes the reader somebody who moderates Storytime.
   *
   * The control is offered on the moderation permission rather than on the
   * administrator role, which is what the endpoint behind it checks.
   *
   * @returns void
   */
  const moderates = (): void => {
    accessControlService.hasPermission.mockImplementation(
      (permission: string) => of(permission === PERMISSIONS.STORYTIME_MODERATE),
    );
  };

  /**
   * Creates the component and runs its first change detection.
   *
   * @param isOwner - Whether the reader owns the content.
   */
  const create = (isOwner = false) => {
    fixture = TestBed.createComponent(CommentThreadComponent);
    component = fixture.componentInstance;
    component.targetType = StorytimeTargetType.STORY;
    component.targetId = STORY_ID;
    component.isOwner = isOwner;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    commentService = {
      getComments: jest.fn().mockReturnValue(of([buildComment()])),
      postComment: jest.fn().mockReturnValue(of(buildComment())),
      updateComment: jest.fn().mockReturnValue(of(buildComment())),
      deleteComment: jest.fn().mockReturnValue(of(buildComment())),
      hideComment: jest.fn().mockReturnValue(of(buildComment())),
      unhideComment: jest.fn().mockReturnValue(of(buildComment())),
      removeComment: jest.fn().mockReturnValue(of(buildComment())),
    };
    authService = {
      isLoggedIn: jest.fn().mockReturnValue(true),
      isLoggedInAsAdmin: jest.fn().mockReturnValue(false),
      getUserId: jest.fn().mockReturnValue(READER_ID),
    };
    accessControlService = {
      hasPermission: jest.fn().mockReturnValue(of(false)),
    };

    await TestBed.configureTestingModule({
      imports: [CommentThreadComponent],
      providers: [
        { provide: CommentService, useValue: commentService },
        { provide: AuthService, useValue: authService },
        { provide: AccessControlService, useValue: accessControlService },
        // The byline links a commenter to their profile, and a router link
        // cannot be built without one.
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('shows the conversation', () => {
    create();

    expect(commentService.getComments).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
    );
    expect(fixture.nativeElement.textContent).toContain('A fine chapter.');
  });

  // A thread runs long, and a reader who has read it wants the page back.
  it('folds the conversation away behind its own bar', () => {
    create();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector(
      'app-collapsible-section button',
    ) as HTMLButtonElement;

    expect(element.querySelector('.lcars-text-bar')?.textContent).toContain(
      'Comments',
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(element.querySelector('.storytime-comments')).toBeNull();
    expect(element.textContent).not.toContain('A fine chapter.');
  });

  // A comment that says neither who wrote it nor when reads as though it came
  // from nobody.
  // A comment is a panel like every other thing the feature lists, with who
  // said it and when on the bar.
  describe('the heading', () => {
    it('names the commenter and dates the comment', () => {
      create();
      const element = fixture.nativeElement as HTMLElement;
      const heading = element.querySelector('.storytime-panel-card__heading');

      expect(
        heading?.querySelector('.storytime-panel-card__name')?.textContent,
      ).toContain('captain.picard');
      expect(heading?.querySelector('time')?.getAttribute('datetime')).toBe(
        '2026-01-01T00:00:00.000Z',
      );
    });

    // The time is stamped in UTC and read wherever the reader is, so it has to
    // say which of the two it is showing.
    it('says which timezone the time is in', () => {
      create();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('time')
          ?.textContent,
      ).toMatch(/\d{2}:\d{2}\s\S+$/);
    });

    it('links a listed commenter to their profile', () => {
      create();

      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('a.storytime-comments__author')
          ?.getAttribute('href'),
      ).toBe('/community/registry/profiles/captain.picard');
    });

    it('names an unlisted commenter without linking them', () => {
      commentService.getComments.mockReturnValue(
        of([
          buildComment({
            author: { username: 'captain.picard', publiclyVisible: false },
          }),
        ]),
      );

      create();
      const element = fixture.nativeElement as HTMLElement;

      expect(
        element.querySelector('.storytime-panel-card__name')?.textContent,
      ).toContain('captain.picard');
      expect(element.querySelector('a.storytime-comments__author')).toBeNull();
    });

    // The conversation outlives the accounts in it.
    it('says a former member wrote it when the account has gone', () => {
      commentService.getComments.mockReturnValue(
        of([buildComment({ author: null })]),
      );

      create();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.storytime-panel-card__name',
        )?.textContent,
      ).toContain('A former member');
    });
  });

  // The thread is one level deep, so only a root comment offers a reply.
  describe('replying', () => {
    /**
     * Reads the reply controls on the thread.
     *
     * @returns One button per comment that offers a reply.
     */
    const replyControls = (): HTMLButtonElement[] => [
      ...(
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(
        '[aria-label="Reply to this comment"]',
      ),
    ];

    it('offers a reply on a root comment and not on a reply to one', () => {
      commentService.getComments.mockReturnValue(
        of([
          buildComment(),
          buildComment({ id: 'reply-1', parentCommentId: 'comment-1' }),
        ]),
      );

      create();

      expect(replyControls()).toHaveLength(1);
    });

    it('opens the reply form when the control is pressed', () => {
      create();

      replyControls()[0].click();
      fixture.detectChanges();

      expect(component.replyingTo).toBe('comment-1');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Your reply',
      );
    });

    // Signing in is what a reader is asked to do instead.
    it('offers no reply to a signed-out reader', () => {
      authService.isLoggedIn.mockReturnValue(false);

      create();

      expect(replyControls()).toHaveLength(0);
    });
  });

  // A conversation is one kind of thing all the way down, so the colour marks
  // where one comment ends and the next begins.
  describe('the colours a thread runs through', () => {
    /**
     * Reads the colour class each comment panel wears.
     *
     * @returns One class per panel, in the order they are shown.
     */
    const colours = (): (string | undefined)[] =>
      [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll(
          '.storytime-comments__body',
        ),
      ].map(panel =>
        [...panel.classList].find(name =>
          name.startsWith('storytime-panel-card--comment-'),
        ),
      );

    it('gives each comment in turn the next colour', () => {
      commentService.getComments.mockReturnValue(
        of([
          buildComment(),
          buildComment({ id: 'comment-2' }),
          buildComment({ id: 'comment-3' }),
        ]),
      );

      create();

      expect(colours()).toEqual([
        'storytime-panel-card--comment-0',
        'storytime-panel-card--comment-1',
        'storytime-panel-card--comment-2',
      ]);
    });

    // A reply belongs to what it replies to, so the pair reads as one block.
    it('gives a reply the colour of what it replies to', () => {
      commentService.getComments.mockReturnValue(
        of([
          buildComment(),
          buildComment({ id: 'comment-2' }),
          buildComment({ id: 'reply-1', parentCommentId: 'comment-2' }),
        ]),
      );

      create();

      expect(colours()).toEqual([
        'storytime-panel-card--comment-0',
        'storytime-panel-card--comment-1',
        'storytime-panel-card--comment-1',
      ]);
    });

    // Two of the same colour are only far enough apart to read as unrelated
    // once the cycle has run its length.
    it('starts the cycle again once it runs out', () => {
      commentService.getComments.mockReturnValue(
        of(
          Array.from({ length: 7 }, (_unused, position) =>
            buildComment({ id: `comment-${position}` }),
          ),
        ),
      );

      create();
      const shown = colours();

      expect(shown).toHaveLength(7);
      expect(shown[6]).toBe(shown[0]);
    });
  });

  it('says so when nobody has commented', () => {
    commentService.getComments.mockReturnValue(of([]));

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'Nobody has said anything yet',
    );
  });

  it('says so when the conversation cannot be loaded', () => {
    commentService.getComments.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.errorMessage).toBe(
      'The conversation could not be loaded.',
    );
    expect(component.isLoading).toBe(false);
  });

  describe('arranging the thread', () => {
    it('puts replies under what they reply to', () => {
      commentService.getComments.mockReturnValue(
        of([
          buildComment(),
          buildComment({ id: 'comment-2', parentCommentId: 'comment-1' }),
        ]),
      );

      create();

      expect(component.nodes).toHaveLength(1);
      expect(component.nodes[0].replies).toHaveLength(1);
    });

    // Somebody wrote it, and losing it silently would be worse than showing it
    // out of place.
    it('shows a reply whose parent is missing rather than dropping it', () => {
      commentService.getComments.mockReturnValue(
        of([buildComment({ id: 'comment-2', parentCommentId: 'gone' })]),
      );

      create();

      expect(component.nodes).toHaveLength(1);
      expect(component.nodes[0].comment.id).toBe('comment-2');
    });
  });

  describe('moderation permission loading', () => {
    it('sets canModerate to true when the reader has the permission', async () => {
      accessControlService.hasPermission.mockReturnValue(of(true));

      create();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.canModerate).toBe(true);
    });

    it('silently fails and leaves canModerate false if permission check fails', async () => {
      accessControlService.hasPermission.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.canModerate).toBe(false);
    });
  });

  describe('posting', () => {
    it('posts what the reader typed', () => {
      create();
      component.draft = '  A fine chapter.  ';

      component.post();

      expect(commentService.postComment).toHaveBeenCalledWith({
        targetType: StorytimeTargetType.STORY,
        targetId: STORY_ID,
        body: 'A fine chapter.',
      });
      expect(component.draft).toBe('');
    });

    it.each([
      ['nothing', ''],
      ['only spaces', '   '],
    ])('posts nothing when the reader typed %s', (_name, draft) => {
      create();
      component.draft = draft;

      component.post();

      expect(commentService.postComment).not.toHaveBeenCalled();
    });

    it('ignores a second post while one is in flight', () => {
      create();
      component.draft = 'Hello.';
      component.isSaving = true;

      component.post();

      expect(commentService.postComment).not.toHaveBeenCalled();
    });

    it('reports what the server said', () => {
      commentService.postComment.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'That is too long.' },
            }),
        ),
      );

      create();
      component.draft = 'Hello.';
      component.post();

      expect(component.errorMessage).toBe('That is too long.');
    });

    it('falls back to its own wording when the server gives none', () => {
      commentService.postComment.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.draft = 'Hello.';
      component.post();

      expect(component.errorMessage).toBe(
        'That could not be saved. Try again.',
      );
    });
  });

  describe('replying', () => {
    it('posts a reply against what it replies to', () => {
      create();
      component.startReply('comment-1');
      component.replyDraft = 'Agreed.';

      component.postReply();

      expect(commentService.postComment).toHaveBeenCalledWith({
        targetType: StorytimeTargetType.STORY,
        targetId: STORY_ID,
        body: 'Agreed.',
        parentCommentId: 'comment-1',
      });
      expect(component.replyingTo).toBeNull();
    });

    it('abandons a reply', () => {
      create();
      component.startReply('comment-1');
      component.replyDraft = 'Agreed.';

      component.cancelReply();

      expect(component.replyingTo).toBeNull();
      expect(component.replyDraft).toBe('');
    });

    it.each([
      ['nothing was typed', () => undefined, ''],
      ['nothing is being replied to', () => component.cancelReply(), 'Agreed.'],
    ])('posts no reply when %s', (_name, arrange, draft) => {
      create();
      component.startReply('comment-1');
      arrange();
      component.replyDraft = draft;

      component.postReply();

      expect(commentService.postComment).not.toHaveBeenCalled();
    });

    it('ignores a second reply while one is in flight', () => {
      create();
      component.startReply('comment-1');
      component.replyDraft = 'Agreed.';
      component.isSaving = true;

      component.postReply();

      expect(commentService.postComment).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('starts from what the comment says', () => {
      create();

      component.startEdit(buildComment());

      expect(component.editingId).toBe('comment-1');
      expect(component.editDraft).toBe('A fine chapter.');
    });

    it('starts from nothing when the comment has no words left', () => {
      create();

      component.startEdit(buildComment({ body: null }));

      expect(component.editDraft).toBe('');
    });

    it('saves the edit', () => {
      create();
      component.startEdit(buildComment());
      component.editDraft = 'A very fine chapter.';

      component.saveEdit();

      expect(commentService.updateComment).toHaveBeenCalledWith(
        'comment-1',
        'A very fine chapter.',
      );
      expect(component.editingId).toBeNull();
    });

    it('abandons an edit', () => {
      create();
      component.startEdit(buildComment());

      component.cancelEdit();

      expect(component.editingId).toBeNull();
      expect(component.editDraft).toBe('');
    });

    it.each([
      ['nothing was typed', () => undefined, ''],
      ['nothing is being edited', () => component.cancelEdit(), 'Hello.'],
    ])('saves nothing when %s', (_name, arrange, draft) => {
      create();
      component.startEdit(buildComment());
      arrange();
      component.editDraft = draft;

      component.saveEdit();

      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it('ignores a second save while one is in flight', () => {
      create();
      component.startEdit(buildComment());
      component.editDraft = 'Hello.';
      component.isSaving = true;

      component.saveEdit();

      expect(commentService.updateComment).not.toHaveBeenCalled();
    });
  });

  it('takes back the reader’s own comment', () => {
    create();

    component.deleteOwn(buildComment());

    expect(commentService.deleteComment).toHaveBeenCalledWith('comment-1');
  });

  describe('an owner tidying their own page', () => {
    it('hides a comment', () => {
      create(true);

      component.toggleHidden(buildComment());

      expect(commentService.hideComment).toHaveBeenCalledWith('comment-1');
    });

    it('puts a hidden comment back', () => {
      create(true);

      component.toggleHidden(
        buildComment({ status: StorytimeCommentStatus.HIDDEN_BY_OWNER }),
      );

      expect(commentService.unhideComment).toHaveBeenCalledWith('comment-1');
    });

    it('offers the control only to the owner', () => {
      create();

      const titles = [...fixture.nativeElement.querySelectorAll('button')].map(
        (button: HTMLButtonElement) => button.getAttribute('title'),
      );

      expect(titles).not.toContain('Hide from my page');
    });

    // The control is an icon, so what it does lives in its title and its
    // accessible name rather than on its face — and has to say which way it
    // is about to go.
    it('says which way the control goes', () => {
      create(true);

      expect(component.hideLabel(buildComment())).toBe('Hide from my page');
      expect(
        component.hideLabel(
          buildComment({ status: StorytimeCommentStatus.HIDDEN_BY_OWNER }),
        ),
      ).toBe('Show on my page');
    });
  });

  describe('an administrator removing a comment', () => {
    beforeEach(() => {
      moderates();
    });

    // The message is quoted to the author word for word, so it is typed
    // rather than picked.
    it('removes it with the reason typed', () => {
      create();
      component.startRemove('comment-1');
      component.removeDraft = '  Against the content policy.  ';

      component.confirmRemove();

      expect(commentService.removeComment).toHaveBeenCalledWith(
        'comment-1',
        'Against the content policy.',
      );
      expect(component.removingId).toBeNull();
    });

    it('abandons a removal', () => {
      create();
      component.startRemove('comment-1');

      component.cancelRemove();

      expect(component.removingId).toBeNull();
      expect(component.removeDraft).toBe('');
    });

    it.each([
      ['no reason was typed', () => undefined, ''],
      [
        'nothing is being removed',
        () => component.cancelRemove(),
        'Against the content policy.',
      ],
    ])('removes nothing when %s', (_name, arrange, draft) => {
      create();
      component.startRemove('comment-1');
      arrange();
      component.removeDraft = draft;

      component.confirmRemove();

      expect(commentService.removeComment).not.toHaveBeenCalled();
    });

    it('ignores a second removal while one is in flight', () => {
      create();
      component.startRemove('comment-1');
      component.removeDraft = 'No.';
      component.isSaving = true;

      component.confirmRemove();

      expect(commentService.removeComment).not.toHaveBeenCalled();
    });
  });

  // "Removed by an administrator" and "deleted by its author" mean different
  // things to somebody reading a reply to it.
  it.each([
    [StorytimeCommentStatus.DELETED_BY_AUTHOR, 'deleted by its author'],
    [StorytimeCommentStatus.HIDDEN_BY_OWNER, 'hidden by the owner'],
    [StorytimeCommentStatus.REMOVED_BY_ADMIN, 'removed by an administrator'],
  ])('says who silenced a %s comment', (status, wording) => {
    commentService.getComments.mockReturnValue(
      of([buildComment({ status, body: null })]),
    );

    create();

    expect(fixture.nativeElement.textContent).toContain(wording);
  });

  it('says nothing about a visible comment being silenced', () => {
    create();

    expect(component.silencedText(buildComment())).toBe('');
  });

  it('asks a signed-out reader to sign in', () => {
    authService.isLoggedIn.mockReturnValue(false);

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'Sign in to join the conversation',
    );
  });

  it('knows which comments are the reader’s own', () => {
    create();

    expect(component.isMine(buildComment())).toBe(true);
    expect(component.isMine(buildComment({ authorUserId: 'other' }))).toBe(
      false,
    );
  });

  // The controls sit in a strip of their own down the side of the panel, and
  // an empty strip is still a strip.
  describe('the controls strip', () => {
    const THEIRS = { authorUserId: 'other' };

    it('offers the owner the hide control on somebody else’s comment', () => {
      create(true);

      expect(component.hasControls(buildComment(THEIRS))).toBe(true);
    });

    it('offers a moderator the same on a comment they cannot reply to', () => {
      moderates();

      create();

      expect(component.hasControls(buildComment(THEIRS))).toBe(true);
    });

    // Moderating is a job given out by permission. Reading the role instead
    // would offer the control to an administrator who has been denied it, and
    // withhold it from a moderator who is not an administrator.
    it('offers nothing to an administrator without the moderation permission', () => {
      authService.isLoggedInAsAdmin.mockReturnValue(true);

      create();

      expect(component.canModerate).toBe(false);
      expect(component.hasControls(buildComment(THEIRS))).toBe(false);
    });

    // Nothing is left to do to a comment an administrator has already removed.
    it('offers the owner nothing once an administrator has removed it', () => {
      create(true);

      expect(
        component.hasControls(
          buildComment({
            ...THEIRS,
            status: StorytimeCommentStatus.REMOVED_BY_ADMIN,
          }),
          true,
        ),
      ).toBe(false);
    });

    it('offers a plain reader nothing on somebody else’s comment', () => {
      create();

      expect(component.hasControls(buildComment(THEIRS))).toBe(false);
    });
  });

  it('reads the thread back after a change', () => {
    create();
    commentService.getComments.mockClear();

    component.deleteOwn(buildComment());

    expect(commentService.getComments).toHaveBeenCalled();
  });
});
