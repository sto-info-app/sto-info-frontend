import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Arc, Story } from 'src/app/models/storytime.models';
import { SearchService } from '../../search.service';
import { CreatorPageComponent } from './creator-page.component';

describe('CreatorPageComponent', () => {
  let fixture: ComponentFixture<CreatorPageComponent>;
  let searchService: { getCreatorWork: jest.Mock };
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

    TestBed.configureTestingModule({
      imports: [CreatorPageComponent],
      providers: [
        provideRouter([]),
        { provide: SearchService, useValue: searchService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
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

    const element = render();

    expect(element.textContent).toContain('has not published anything');
    expect(fixture.componentInstance.isEmpty).toBe(true);
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
