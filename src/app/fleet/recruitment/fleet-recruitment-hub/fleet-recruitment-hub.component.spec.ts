import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import {
  pageText,
  RECRUITMENT_FLEET_HREF,
  recruitmentFleet,
  recruitmentRoute,
  RecruitmentRouteStubs,
} from 'src/app/fleet/recruitment/recruitment.testing';

import {
  FLEET_RECRUITMENT_NOT_PERMITTED,
  FleetRecruitmentHubComponent,
} from './fleet-recruitment-hub.component';

describe('FleetRecruitmentHubComponent', () => {
  let fixture: ComponentFixture<FleetRecruitmentHubComponent>;
  let route: RecruitmentRouteStubs;

  /**
   * Draws the hub for a reader holding some capabilities.
   *
   * @param capabilities - What they hold.
   * @param fleet - Changes to the Fleet.
   */
  async function render(
    capabilities: string[],
    fleet: Parameters<typeof recruitmentFleet>[1] = {},
  ): Promise<void> {
    route = recruitmentRoute(capabilities);
    route.scopes.resolveFleet.mockReturnValue(
      of(recruitmentFleet(capabilities, fleet)),
    );

    await TestBed.configureTestingModule({
      imports: [FleetRecruitmentHubComponent],
      providers: route.providers,
    }).compileComponents();

    fixture = TestBed.createComponent(FleetRecruitmentHubComponent);
    fixture.detectChanges();
  }

  /**
   * The pages offered, tabs aside.
   *
   * @returns Each one's label and address.
   */
  function offered(): [string, string | null][] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.fleet-recruitment-hub__item a',
      ),
    ).map(link => [String(link.textContent).trim(), link.getAttribute('href')]);
  }

  it('offers every part to somebody who holds them all', async () => {
    await render([
      'applications.view',
      'applications.decide',
      'members.manage',
      'recruitment.manage',
    ]);

    expect(offered()).toEqual([
      ['Applications', `${RECRUITMENT_FLEET_HREF}/recruitment/applications`],
      ['Invitations', `${RECRUITMENT_FLEET_HREF}/recruitment/invitations`],
      ['Members', `${RECRUITMENT_FLEET_HREF}/recruitment/members`],
      ['Settings', `${RECRUITMENT_FLEET_HREF}/recruitment/settings`],
    ]);
    expect(pageText(fixture)).toContain('Read the applications to Ninth Fleet');
  });

  it.each([
    ['applications.view', ['Applications', 'Invitations']],
    ['members.manage', ['Members']],
    ['recruitment.manage', ['Settings']],
  ])('offers a holder of %s only its own part', async (capability, labels) => {
    await render([capability]);

    expect(offered().map(([label]) => label)).toEqual(labels);
  });

  it('says so when a decider alone has nothing here to open', async () => {
    await render(['applications.decide']);

    expect(offered()).toEqual([]);
    expect(pageText(fixture)).toContain('Nothing here is yours to run.');
  });

  it('turns away somebody with no part in recruitment', async () => {
    await render(['roster.view']);

    expect(pageText(fixture)).toContain(FLEET_RECRUITMENT_NOT_PERMITTED);
  });

  // A console Fleet has no roster, but it still recruits.
  it('opens on a Fleet with no roster export', async () => {
    await render(['recruitment.manage'], {
      platformProvidesRosterExport: false,
    });

    expect(offered().map(([label]) => label)).toEqual(['Settings']);
  });
});
