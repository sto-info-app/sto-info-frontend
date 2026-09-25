import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  FleetTabsComponent,
  FleetTabsVm,
  fleetTabsVmOf,
} from './fleet-tabs.component';

const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';

/**
 * Builds the strip's view model for a reader holding some capabilities.
 *
 * @param capabilities - What they hold.
 * @returns The view model.
 */
function vm(...capabilities: string[]): FleetTabsVm {
  return {
    communitySlug: 'united-federation-alliance',
    platformSegment: 'pc',
    fleetSlug: 'ninth-fleet',
    capabilities,
  };
}

describe('FleetTabsComponent', () => {
  let fixture: ComponentFixture<FleetTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetTabsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Draws the strip.
   *
   * @param model - What it is drawn for.
   * @returns Each tab's label and address.
   */
  function draw(model: FleetTabsVm): [string, string | null][] {
    fixture = TestBed.createComponent(FleetTabsComponent);
    fixture.componentRef.setInput('vm', model);
    fixture.detectChanges();

    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a.lcars-tab'),
    ).map(tab => [tab.textContent?.trim() ?? '', tab.getAttribute('href')]);
  }

  it('offers anybody the Overview', () => {
    expect(draw(vm())).toEqual([['Overview', FLEET_HREF]]);
  });

  it.each(['roster.import', 'roster.investigate'])(
    'offers Investigate to a reader holding %s',
    capability => {
      expect(draw(vm(capability))).toEqual([
        ['Overview', FLEET_HREF],
        ['Investigate', `${FLEET_HREF}/investigate`],
      ]);
    },
  );

  it('offers the Roster to a member', () => {
    expect(draw(vm('roster.view'))).toEqual([
      ['Overview', FLEET_HREF],
      ['Roster', `${FLEET_HREF}/roster`],
    ]);
  });

  it('draws every tab in strip order for somebody who may open them all', () => {
    expect(
      draw(vm('roster.investigate', 'roster.view')).map(([label]) => label),
    ).toEqual(['Overview', 'Roster', 'Investigate']);
  });

  it('names itself for a screen reader moving by landmark', () => {
    draw(vm());

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('nav')
        ?.getAttribute('aria-label'),
    ).toBe('Fleet sections');
  });

  describe('fleetTabsVmOf', () => {
    /**
     * Builds a resolved Fleet.
     *
     * @param fleet - Changes to the Fleet.
     * @returns The resolved Fleet.
     */
    function resolved(
      fleet: Partial<ResolvedStoFleet['fleet']> = {},
    ): ResolvedStoFleet {
      return {
        fleet: {
          slug: 'ninth-fleet',
          communityId: 'community-1',
          platformProvidesRosterExport: true,
          ...fleet,
        },
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        viewer: { capabilities: ['roster.view'] },
      } as unknown as ResolvedStoFleet;
    }

    it('draws the strip for a Fleet with a roster', () => {
      expect(fleetTabsVmOf(resolved())).toEqual(vm('roster.view'));
    });

    it('draws none for a Fleet no Community holds', () => {
      expect(fleetTabsVmOf(resolved({ communityId: null }))).toBeNull();
    });

    it('draws none for a Fleet on a platform with no roster export', () => {
      expect(
        fleetTabsVmOf(resolved({ platformProvidesRosterExport: false })),
      ).toBeNull();
    });
  });
});
