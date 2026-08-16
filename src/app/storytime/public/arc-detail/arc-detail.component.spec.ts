import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  Arc,
  ArcMembership,
  ArcMembershipStatus,
  ArcWithStories,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { ArcDetailComponent } from './arc-detail.component';

describe('ArcDetailComponent', () => {
  let fixture: ComponentFixture<ArcDetailComponent>;
  let arcService: { getArc: jest.Mock };
  let params: BehaviorSubject<Map<string, string>>;

  /**
   * Builds an Arc.
   *
   * @param overrides - Fields to change.
   * @returns The Arc.
   */
  const buildArc = (overrides: Partial<Arc> = {}): Arc =>
    ({
      id: 'arc-1',
      slug: 'the-long-war',
      title: 'The Long War',
      ownerUserId: 'curator-1',
      shortDescription: 'A summary',
      descriptionHtml: '<p id="b1">A curated order.</p>',
      languageCode: 'en',
      bannerImageUrl: null,
      bannerImageAlt: null,
      profileImageUrl: null,
      profileImageAlt: null,
      rating: 0,
      publishedAt: null,
      ...overrides,
    }) as Arc;

  /**
   * Builds a membership with its Story.
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
      story: {
        slug: 'a-story',
        title: 'A Story',
        shortDescription: 'Where it begins.',
      },
      ...overrides,
    }) as ArcMembership;

  /**
   * Builds the response for the page.
   *
   * @param overrides - Fields to change.
   * @returns The response.
   */
  const buildResponse = (
    overrides: Partial<ArcWithStories> = {},
  ): ArcWithStories => ({
    arc: buildArc(),
    stories: [buildMembership()],
    ...overrides,
  });

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcDetailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new BehaviorSubject(new Map([['arcSlug', 'the-long-war']]));
    arcService = { getArc: jest.fn().mockReturnValue(of(buildResponse())) };

    TestBed.configureTestingModule({
      imports: [ArcDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('shows the Arc', () => {
    const element = render();

    expect(element.textContent).toContain('The Long War');
    expect(element.textContent).toContain('A summary');
  });

  it('renders the server-rendered description', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-arc__description')?.innerHTML,
    ).toContain('A curated order.');
  });

  // The lang attribute lets a screen reader pronounce the Arc correctly.
  it('carries the Arc language on the article', () => {
    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
  });

  it('lists the reading order', () => {
    const element = render();
    const link = element.querySelector('.storytime-arc__stories a');

    expect(link?.textContent).toContain('A Story');
    expect(link?.getAttribute('href')).toContain('a-story');
  });

  // The curator's note about a Story's place is more use than the Story's own
  // summary, which the reader will see when they get there.
  it('prefers the curator’s note to the Story’s summary', () => {
    arcService.getArc.mockReturnValue(
      of(
        buildResponse({
          stories: [buildMembership({ introductoryNote: 'Start here.' })],
        }),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('Start here.');
    expect(element.textContent).not.toContain('Where it begins.');
  });

  it('falls back to the Story’s summary when there is no note', () => {
    const element = render();

    expect(element.textContent).toContain('Where it begins.');
  });

  // A curator may assemble an Arc before its Stories are out, so an empty
  // reading order is a real state rather than a mistake.
  it('explains an Arc whose Stories are not published yet', () => {
    arcService.getArc.mockReturnValue(of(buildResponse({ stories: [] })));

    const element = render();

    expect(element.textContent).toContain(
      'None of the Stories in this Arc are published yet',
    );
  });

  it('reloads when the route moves to another Arc', () => {
    render();

    params.next(new Map([['arcSlug', 'another-arc']]));

    expect(arcService.getArc).toHaveBeenLastCalledWith('another-arc');
  });

  it('asks for an empty slug when the route carries none', () => {
    params.next(new Map());

    render();

    expect(arcService.getArc).toHaveBeenCalledWith('');
  });

  it('explains a missing Arc', () => {
    arcService.getArc.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    arcService.getArc.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
  });

  it('shows nothing where an Arc has no description', () => {
    arcService.getArc.mockReturnValue(
      of(buildResponse({ arc: buildArc({ descriptionHtml: null }) })),
    );

    const element = render();

    expect(element.querySelector('.storytime-arc__description')).toBeNull();
  });

  // Artwork is optional throughout Storytime.
  it('renders no banner when the Arc has none', () => {
    const element = render();

    expect(element.querySelector('.storytime-arc__banner')).toBeNull();
  });

  it('renders the banner with its alternative text when present', () => {
    arcService.getArc.mockReturnValue(
      of(
        buildResponse({
          arc: buildArc({
            bannerImageUrl: 'https://cdn.test/banner',
            bannerImageAlt: 'A fleet',
          }),
        }),
      ),
    );

    const element = render();

    expect(
      element.querySelector('.storytime-arc__banner')?.getAttribute('alt'),
    ).toBe('A fleet');
  });
});
