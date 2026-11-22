import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { of } from 'rxjs';

import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  findButton,
  pageText,
  pressButton,
  RECRUITMENT_FLEET_HREF,
  recruitmentRoute,
  RecruitmentRouteStubs,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetApplicationPage,
  FleetApplicationRoute,
  FleetApplicationStatus,
  FleetApplicationSummary,
} from 'src/app/models/fleet-recruitment.models';

import {
  FLEET_APPLICATIONS_NOT_PERMITTED,
  FleetApplicationsComponent,
} from './fleet-applications.component';

/**
 * Builds one row of the inbox.
 *
 * @param overrides - Fields to override.
 * @returns The row.
 */
function summary(
  overrides: Partial<FleetApplicationSummary> = {},
): FleetApplicationSummary {
  return {
    id: 'application-1',
    status: FleetApplicationStatus.PENDING,
    route: FleetApplicationRoute.APPLICATION,
    applicantUsername: 'FleetApplicant',
    characterName: 'Dax Orlan@fixture002',
    characterLevel: 65,
    factionName: 'Federation',
    submittedAt: '2026-09-20T10:00:00.000Z',
    decidedAt: null,
    ...overrides,
  };
}

/**
 * Builds a page of the inbox.
 *
 * @param items - Its rows.
 * @param overrides - Fields to override.
 * @returns The page.
 */
function page(
  items: FleetApplicationSummary[],
  overrides: Partial<FleetApplicationPage> = {},
): FleetApplicationPage {
  return { items, page: 1, pageSize: 25, total: items.length, ...overrides };
}

describe('FleetApplicationsComponent', () => {
  let fixture: ComponentFixture<FleetApplicationsComponent>;
  let route: RecruitmentRouteStubs;
  let recruitment: { applications: jest.Mock };
  let navigate: jest.SpyInstance;

  /**
   * Draws the inbox.
   *
   * @param capabilities - What the reader holds.
   * @param query - The address's query.
   */
  async function render(
    capabilities: string[] = ['applications.view'],
    query: Record<string, string> = {},
  ): Promise<void> {
    route = recruitmentRoute(capabilities);
    route.query$.next(convertToParamMap(query));

    await TestBed.configureTestingModule({
      imports: [FleetApplicationsComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetApplicationsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    recruitment = {
      applications: jest.fn(() => of(page([summary()]))),
    };
  });

  it('asks for those waiting, from the first page, by default', async () => {
    await render();

    expect(recruitment.applications).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      { status: FleetApplicationStatus.PENDING, page: 1 },
    );
  });

  it('asks for the status and page the address names', async () => {
    await render(['applications.view'], { status: 'REJECTED', page: '3' });

    expect(recruitment.applications).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      { status: FleetApplicationStatus.REJECTED, page: 3 },
    );
  });

  it('asks for those waiting when the address names no status it knows', async () => {
    await render(['applications.view'], { status: 'LOST', page: 'x' });

    expect(recruitment.applications).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      { status: FleetApplicationStatus.PENDING, page: 1 },
    );
  });

  it('lists each application, linking to it', async () => {
    recruitment.applications.mockReturnValue(
      of(
        page([
          summary(),
          summary({
            id: 'application-2',
            route: FleetApplicationRoute.INVITATION,
            applicantUsername: null,
            characterLevel: null,
            factionName: null,
          }),
        ]),
      ),
    );

    await render();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody a'),
    ).map(link => link.getAttribute('href'));

    expect(links).toEqual([
      `${RECRUITMENT_FLEET_HREF}/recruitment/applications/application-1`,
      `${RECRUITMENT_FLEET_HREF}/recruitment/applications/application-2`,
    ]);
    expect(pageText(fixture)).toContain('FleetApplicant');
    expect(pageText(fixture)).toContain('An account since closed');
    expect(pageText(fixture)).toContain('Invitation');
    expect(pageText(fixture)).toContain('Waiting for a decision: 2 in all');
  });

  it('says so when nothing is in that status', async () => {
    recruitment.applications.mockReturnValue(of(page([])));

    await render(['applications.view'], { status: 'WITHDRAWN' });

    expect(pageText(fixture)).toContain(
      'No application to this Fleet is withdrawn.',
    );
  });

  it('changes status from the first page, keeping the default out of the address', async () => {
    await render();

    pressButton(fixture, 'Accepted');
    pressButton(fixture, 'Waiting');

    expect(navigate).toHaveBeenNthCalledWith(
      1,
      [],
      expect.objectContaining({
        queryParams: { status: 'ACCEPTED', page: null },
      }),
    );
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      [],
      expect.objectContaining({ queryParams: { status: null, page: null } }),
    );
  });

  describe('pages', () => {
    it('turns forward and back, keeping page 1 out of the address', async () => {
      recruitment.applications.mockReturnValue(
        of(page([summary()], { page: 2, total: 60 })),
      );

      await render(['applications.view'], { page: '2' });

      expect(pageText(fixture)).toContain('Page 2 of 3');
      pressButton(fixture, 'Next');
      pressButton(fixture, 'Previous');

      expect(navigate).toHaveBeenNthCalledWith(
        1,
        [],
        expect.objectContaining({ queryParams: { page: 3 } }),
      );
      expect(navigate).toHaveBeenNthCalledWith(
        2,
        [],
        expect.objectContaining({ queryParams: { page: null } }),
      );
    });

    it('offers no pages when there is one', async () => {
      await render();

      expect(findButton(fixture, 'Next')).toBeUndefined();
    });
  });

  it('turns away somebody who may not read them', async () => {
    await render(['applications.decide']);

    expect(pageText(fixture)).toContain(FLEET_APPLICATIONS_NOT_PERMITTED);
    expect(recruitment.applications).not.toHaveBeenCalled();
  });
});
