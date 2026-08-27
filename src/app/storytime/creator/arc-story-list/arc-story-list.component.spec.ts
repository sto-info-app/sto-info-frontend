import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ArcMembership,
  ArcMembershipStatus,
  ManagedStory,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { StoryService } from '../../story.service';
import { ArcStoryListComponent } from './arc-story-list.component';

describe('ArcStoryListComponent', () => {
  let fixture: ComponentFixture<ArcStoryListComponent>;
  let arcService: {
    getArcStories: jest.Mock;
    inviteStory: jest.Mock;
    reorderArcStories: jest.Mock;
    approveMembership: jest.Mock;
    declineMembership: jest.Mock;
    leaveArc: jest.Mock;
  };
  let storyService: { getMyStories: jest.Mock };
  let routeParams: Map<string, string>;

  /**
   * Builds a membership.
   *
   * @param overrides - Fields to change.
   * @returns The membership.
   */
  const buildMembership = (
    overrides: Partial<ArcMembership> = {},
  ): ArcMembership =>
    ({
      id: 'membership-1',
      arcId: 'arc-1',
      storyId: 'story-1',
      orderIndex: 1000,
      membershipStatus: ArcMembershipStatus.APPROVED,
      introductoryNote: null,
      story: { id: 'story-1', title: 'First Contact' },
      ...overrides,
    }) as ArcMembership;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcStoryListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    routeParams = new Map([['arcId', 'arc-1']]);
    arcService = {
      getArcStories: jest.fn().mockReturnValue(of([buildMembership()])),
      inviteStory: jest.fn().mockReturnValue(of([])),
      reorderArcStories: jest.fn().mockReturnValue(of([])),
      approveMembership: jest.fn().mockReturnValue(of([])),
      declineMembership: jest.fn().mockReturnValue(of([])),
      leaveArc: jest.fn().mockReturnValue(of([])),
    };
    storyService = {
      getMyStories: jest
        .fn()
        .mockReturnValue(
          of([{ id: 'story-9', title: 'Mine' } as ManagedStory]),
        ),
    };

    TestBed.configureTestingModule({
      imports: [ArcStoryListComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
        { provide: StoryService, useValue: storyService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  it('lists what is in the Arc', () => {
    const element = render();

    expect(element.textContent).toContain('First Contact');
    expect(arcService.getArcStories).toHaveBeenCalledWith('arc-1');
  });

  // The route always carries one, but asking for an empty Arc beats asking
  // for "undefined".
  it('asks for an empty Arc when the route names none', () => {
    routeParams.clear();

    render();

    expect(arcService.getArcStories).toHaveBeenCalledWith('');
  });

  // Only agreed Stories are in the reading order; the rest are still waiting.
  it('separates the reading order from what is waiting', () => {
    arcService.getArcStories.mockReturnValue(
      of([
        buildMembership(),
        buildMembership({
          id: 'membership-2',
          membershipStatus: ArcMembershipStatus.INVITED,
        }),
      ]),
    );

    render();

    expect(fixture.componentInstance.approved).toHaveLength(1);
    expect(fixture.componentInstance.pending).toHaveLength(1);
  });

  it('says so when nothing has joined yet', () => {
    arcService.getArcStories.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('Nothing has joined this Arc yet');
  });

  // A Story can be unpublished or made private after joining, and a blank line
  // would leave the curator unable to act on it.
  it('describes a Story it can no longer see', () => {
    render();

    expect(
      fixture.componentInstance.describe(buildMembership({ story: null })),
    ).toContain('no longer see');
  });

  describe('inviting', () => {
    it('offers the caller’s own Stories directly', () => {
      const element = render();

      expect(element.textContent).toContain('Mine');
    });

    // Offering to add something already there would only produce an error.
    it('leaves out a Story already in the Arc', () => {
      storyService.getMyStories.mockReturnValue(
        of([{ id: 'story-1', title: 'First Contact' } as ManagedStory]),
      );

      render();

      expect(fixture.componentInstance.invitableStories).toHaveLength(0);
    });

    // A Story that declined can be asked again, so it belongs back on offer.
    it('offers a Story again after it declined', () => {
      arcService.getArcStories.mockReturnValue(
        of([
          buildMembership({
            storyId: 'story-9',
            membershipStatus: ArcMembershipStatus.DECLINED,
          }),
        ]),
      );

      render();

      expect(fixture.componentInstance.invitableStories).toHaveLength(1);
    });

    it('invites a Story by its identifier', () => {
      render();
      fixture.componentInstance.form.patchValue({ storyId: ' story-2 ' });
      fixture.componentInstance.invite();

      expect(arcService.inviteStory).toHaveBeenCalledWith('arc-1', 'story-2');
    });

    it('refuses to invite nothing', () => {
      render();
      fixture.componentInstance.invite();

      expect(arcService.inviteStory).not.toHaveBeenCalled();
    });

    it('invites one of the caller’s own in a single click', () => {
      render();
      fixture.componentInstance.inviteStory('story-9');

      expect(arcService.inviteStory).toHaveBeenCalledWith('arc-1', 'story-9');
    });

    // A convenience failing must not stop the curator using the Arc.
    it('carries on when the caller’s own Stories cannot be loaded', () => {
      storyService.getMyStories.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.componentInstance.myStories).toEqual([]);
      expect(fixture.componentInstance.errorMessage).toBe('');
    });
  });

  describe('answering', () => {
    beforeEach(() => {
      arcService.getArcStories.mockReturnValue(
        of([
          buildMembership({
            membershipStatus: ArcMembershipStatus.REQUESTED,
          }),
        ]),
      );
    });

    // Which status a membership holds says which side is still waiting.
    it('knows a request waits on the curator', () => {
      render();

      expect(
        fixture.componentInstance.awaitsCurator(
          buildMembership({ membershipStatus: ArcMembershipStatus.REQUESTED }),
        ),
      ).toBe(true);
      expect(
        fixture.componentInstance.awaitsCurator(
          buildMembership({ membershipStatus: ArcMembershipStatus.INVITED }),
        ),
      ).toBe(false);
    });

    it('agrees to a Story that asked to join', () => {
      render();
      fixture.componentInstance.approve(buildMembership());

      expect(arcService.approveMembership).toHaveBeenCalledWith('membership-1');
    });

    it('turns down a Story that asked to join', () => {
      render();
      fixture.componentInstance.decline(buildMembership());

      expect(arcService.declineMembership).toHaveBeenCalledWith('membership-1');
    });

    it('takes a Story back out', () => {
      render();
      fixture.componentInstance.remove(buildMembership());

      expect(arcService.leaveArc).toHaveBeenCalledWith('membership-1');
    });
  });

  describe('ordering', () => {
    beforeEach(() => {
      arcService.getArcStories.mockReturnValue(
        of([
          buildMembership({ id: 'membership-1' }),
          buildMembership({ id: 'membership-2', storyId: 'story-2' }),
          buildMembership({ id: 'membership-3', storyId: 'story-3' }),
        ]),
      );
    });

    // The whole order is sent because the server settles the positions itself.
    it('sends the whole order when something moves', () => {
      render();
      fixture.componentInstance.moveDown(0);

      expect(arcService.reorderArcStories).toHaveBeenCalledWith('arc-1', [
        'membership-2',
        'membership-1',
        'membership-3',
      ]);
    });

    it('moves a Story earlier', () => {
      render();
      fixture.componentInstance.moveUp(2);

      expect(arcService.reorderArcStories).toHaveBeenCalledWith('arc-1', [
        'membership-1',
        'membership-3',
        'membership-2',
      ]);
    });

    it.each([
      ['above the first', 0, 'moveUp'],
      ['below the last', 2, 'moveDown'],
    ])('refuses to move a Story %s', (_name, index, method) => {
      render();
      fixture.componentInstance[method as 'moveUp' | 'moveDown'](index);

      expect(arcService.reorderArcStories).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('explains a refused change in the server’s words', () => {
      arcService.inviteStory.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'That Story is already in this Arc.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.inviteStory('story-9');

      expect(fixture.componentInstance.errorMessage).toContain('already in');
    });

    it('falls back to a generic message when the server gives none', () => {
      arcService.inviteStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.inviteStory('story-9');

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });

    it('says plainly when the caller does not curate the Arc', () => {
      arcService.getArcStories.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'do not curate this Arc',
      );
    });

    it('reports any other failure to load', () => {
      arcService.getArcStories.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });
  });
});
