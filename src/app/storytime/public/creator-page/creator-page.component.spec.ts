import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Arc, ReadingList, Story } from 'src/app/models/storytime.models';
import { FollowService } from '../../follow.service';
import { ReadingListService } from '../../reading-list.service';
import { SearchService } from '../../search.service';
import { CreatorPageComponent } from './creator-page.component';

describe('CreatorPageComponent', () => {
  let fixture: ComponentFixture<CreatorPageComponent>;
  let searchService: { getCreatorWork: jest.Mock };
  let readingListService: { getPublicLists: jest.Mock };
  let followService: { getFollowState: jest.Mock };
  let params: BehaviorSubject<Map<string, string>>;

  const story = {
    id: 'story-1',
    slug: 'a-story',
    title: 'A Story',
    shortDescription: 'Where it begins.',
  } as Story;

  const arc = {
    id: 'arc-1',
    slug: 'the-long-war',
    title: 'The Long War',
    shortDescription: 'A reading order.',
  } as Arc;

  const readingList = {
    id: 'list-1',
    ownerUserId: 'user-1',
    name: 'Klingon favourites',
    slug: 'klingon-favourites',
    description: null,
    isPublic: true,
    itemCount: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as ReadingList;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(CreatorPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new BehaviorSubject(new Map([['userId', 'user-1']]));
    searchService = {
      getCreatorWork: jest
        .fn()
        .mockReturnValue(of({ stories: [story], arcs: [arc] })),
    };
    readingListService = {
      getPublicLists: jest.fn().mockReturnValue(of([readingList])),
    };
    // Signed out, so the follow button shows nothing and this spec stays about
    // the creator's work.
    followService = {
      getFollowState: jest
        .fn()
        .mockReturnValue(of({ isFollowing: false, followerCount: 0 })),
    };

    TestBed.configureTestingModule({
      imports: [CreatorPageComponent],
      providers: [
        provideRouter([]),
        { provide: SearchService, useValue: searchService },
        { provide: ReadingListService, useValue: readingListService },
        { provide: FollowService, useValue: followService },
        {
          provide: AuthService,
          useValue: { isLoggedIn: jest.fn().mockReturnValue(false) },
        },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('lists the reading lists the member has made public', () => {
    const element = render();

    expect(readingListService.getPublicLists).toHaveBeenCalledWith('user-1');
    expect(element.textContent).toContain('Klingon favourites');
  });

  // A creator page is about what they have written, and losing the lists
  // should not turn it into an error page.
  it('shows the work even when the reading lists cannot be read', () => {
    readingListService.getPublicLists.mockReturnValue(
      throwError(() => new Error('nope')),
    );

    const element = render();

    expect(element.textContent).toContain('A Story');
    expect(element.textContent).not.toContain('Klingon favourites');
  });

  it('lists what the member has published', () => {
    const element = render();

    expect(element.textContent).toContain('A Story');
    expect(element.textContent).toContain('Where it begins.');
    expect(searchService.getCreatorWork).toHaveBeenCalledWith('user-1');
  });

  it('lists the Arcs they curate', () => {
    const element = render();

    expect(element.textContent).toContain('The Long War');
  });

  it('links a Story to its own page', () => {
    const link = render().querySelector('.storytime-creator__stories a');

    expect(link?.getAttribute('href')).toContain('stories/a-story');
  });

  it('links an Arc to its own page', () => {
    const link = render().querySelector('.storytime-creator__arcs a');

    expect(link?.getAttribute('href')).toContain('arcs/the-long-war');
  });

  it('says so when they have published nothing', () => {
    searchService.getCreatorWork.mockReturnValue(of({ stories: [], arcs: [] }));
    readingListService.getPublicLists.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('has not published anything');
    expect(fixture.componentInstance.isEmpty).toBe(true);
  });

  // A member who has published nothing but keeps a public list still has
  // something worth showing.
  it('is not empty when only a reading list is public', () => {
    searchService.getCreatorWork.mockReturnValue(of({ stories: [], arcs: [] }));

    render();

    expect(fixture.componentInstance.isEmpty).toBe(false);
  });

  it('shows only the sections that have something in them', () => {
    searchService.getCreatorWork.mockReturnValue(
      of({ stories: [story], arcs: [] }),
    );

    const element = render();

    expect(element.textContent).toContain('Stories');
    expect(element.querySelector('.storytime-creator__arcs')).toBeNull();
  });

  it('reloads when the route moves to another member', () => {
    render();

    params.next(new Map([['userId', 'user-2']]));

    expect(searchService.getCreatorWork).toHaveBeenLastCalledWith('user-2');
  });

  it('asks for an empty member when the route carries none', () => {
    params.next(new Map());

    render();

    expect(searchService.getCreatorWork).toHaveBeenCalledWith('');
  });

  it('reports a failure to load', () => {
    searchService.getCreatorWork.mockReturnValue(
      throwError(() => new Error('unavailable')),
    );

    const element = render();

    expect(element.textContent).toContain('could not be loaded');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });
});
