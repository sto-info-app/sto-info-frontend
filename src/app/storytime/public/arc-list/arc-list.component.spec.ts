import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Arc, StorytimeTagCategory } from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { ArcListComponent } from './arc-list.component';

describe('ArcListComponent', () => {
  let fixture: ComponentFixture<ArcListComponent>;
  let arcService: { getArcs: jest.Mock };

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
      shortDescription: 'A summary',
      profileImageUrl: null,
      profileImageAlt: null,
      tags: [],
      ...overrides,
    }) as Arc;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    arcService = { getArcs: jest.fn().mockReturnValue(of([buildArc()])) };

    TestBed.configureTestingModule({
      imports: [ArcListComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
      ],
    });
  });

  it('lists the published Arcs', () => {
    const element = render();

    expect(element.textContent).toContain('The Long War');
    expect(element.textContent).toContain('A summary');
  });

  it('links each Arc to its page', () => {
    const element = render();

    expect(
      element
        .querySelector(
          '.storytime-panel-card--arc .storytime-panel-card__heading',
        )
        ?.getAttribute('href'),
    ).toContain('the-long-war');
  });

  it('explains an empty list', () => {
    arcService.getArcs.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('no published Arcs yet');
  });

  it('shows an image only when an Arc has one', () => {
    const element = render();

    expect(element.querySelector('.storytime-arc-list__image')).toBeNull();
  });

  it('shows the image with its alternative text when present', () => {
    arcService.getArcs.mockReturnValue(
      of([
        buildArc({
          profileImageUrl: 'https://cdn.test/arc',
          profileImageAlt: 'A fleet',
        }),
      ]),
    );

    const element = render();

    expect(
      element.querySelector('.storytime-arc-list__image')?.getAttribute('alt'),
    ).toBe('A fleet');
  });

  // The Arc listing says what an Arc is about the way the Spotlight panel and
  // the Story listing do.
  it('closes each panel with what the Arc is tagged with', () => {
    arcService.getArcs.mockReturnValue(
      of([
        buildArc({
          tags: [
            {
              id: 'tag-1',
              slug: 'war',
              name: 'War',
              description: null,
              category: StorytimeTagCategory.THEME,
              displayOrder: 0,
            },
          ],
        }),
      ]),
    );

    const element = render();

    expect(
      [...element.querySelectorAll('.storytime-tag-row__tag')].map(tag =>
        tag.textContent?.trim(),
      ),
    ).toEqual(['War']);
  });

  it('renders no tag row for an untagged Arc', () => {
    const element = render();

    expect(element.querySelector('.storytime-tag-row')).toBeNull();
  });

  it('explains a list that could not be loaded', () => {
    arcService.getArcs.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const element = render();

    expect(element.textContent).toContain('could not be loaded');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });
});
