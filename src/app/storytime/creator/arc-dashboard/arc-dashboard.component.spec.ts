import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ArcStatus,
  ManagedArc,
  StorytimeVisibility,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { ArcDashboardComponent } from './arc-dashboard.component';

describe('ArcDashboardComponent', () => {
  let fixture: ComponentFixture<ArcDashboardComponent>;
  let arcService: {
    getMyArcs: jest.Mock;
    publishArc: jest.Mock;
    unpublishArc: jest.Mock;
  };

  /**
   * Builds a curated Arc.
   *
   * @param overrides - Fields to change.
   * @returns The Arc.
   */
  const buildArc = (overrides: Partial<ManagedArc> = {}): ManagedArc =>
    ({
      id: 'arc-1',
      slug: 'the-long-war',
      title: 'The Long War',
      status: ArcStatus.DRAFT,
      visibility: StorytimeVisibility.PRIVATE,
      publishedAt: null,
      ...overrides,
    }) as ManagedArc;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcDashboardComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    arcService = {
      getMyArcs: jest.fn().mockReturnValue(of([buildArc()])),
      publishArc: jest.fn().mockReturnValue(of(buildArc())),
      unpublishArc: jest.fn().mockReturnValue(of(buildArc())),
    };

    TestBed.configureTestingModule({
      imports: [ArcDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
      ],
    });
  });

  it('lists the Arcs the caller curates', () => {
    const element = render();

    expect(element.textContent).toContain('The Long War');
  });

  it('describes status and visibility in words', () => {
    const element = render();

    expect(element.textContent).toContain('Draft');
    expect(element.textContent).toContain('Private');
  });

  it('invites a first Arc when there are none', () => {
    arcService.getMyArcs.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('not curating an Arc yet');
  });

  it('offers publishing for a draft', () => {
    render();

    expect(fixture.componentInstance.canPublish(buildArc())).toBe(true);
  });

  it('offers unpublishing for a published Arc', () => {
    render();

    expect(
      fixture.componentInstance.canPublish(
        buildArc({ status: ArcStatus.PUBLISHED }),
      ),
    ).toBe(false);
  });

  it('publishes an Arc and reloads', () => {
    render();
    fixture.componentInstance.publish(buildArc());

    expect(arcService.publishArc).toHaveBeenCalledWith('arc-1');
    expect(arcService.getMyArcs).toHaveBeenCalledTimes(2);
  });

  it('unpublishes an Arc', () => {
    render();
    fixture.componentInstance.unpublish(buildArc());

    expect(arcService.unpublishArc).toHaveBeenCalledWith('arc-1');
  });

  // Only a published Arc has anything for a reader to look at.
  it('offers the reader view only once the Arc is published', () => {
    arcService.getMyArcs.mockReturnValue(
      of([buildArc({ publishedAt: '2026-01-01T00:00:00.000Z' })]),
    );

    const element = render();

    expect(element.textContent).toContain('View as a reader');
  });

  it('leaves out the reader view while the Arc is a draft', () => {
    const element = render();

    expect(element.textContent).not.toContain('View as a reader');
  });

  // A refused publish names exactly what the Arc is still missing.
  it('shows the reason the server gave for a refused action', () => {
    arcService.publishArc.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'an Arc needs at least one agreed Story' },
          }),
      ),
    );

    render();
    fixture.componentInstance.publish(buildArc());

    expect(fixture.componentInstance.errorMessage).toContain('agreed Story');
  });

  it('falls back to a generic message when the server gives none', () => {
    arcService.publishArc.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.publish(buildArc());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
  });

  it('reports a failure to load', () => {
    arcService.getMyArcs.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });
});
