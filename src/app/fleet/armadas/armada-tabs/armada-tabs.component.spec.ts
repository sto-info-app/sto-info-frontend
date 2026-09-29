import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of } from 'rxjs';

import {
  ARMADA_HREF,
  resolvedArmada,
} from 'src/app/fleet/armadas/armada.testing';
import { FLEET_FEATURES_DISABLED } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { ArmadaTabsComponent, armadaTabsVmOf } from './armada-tabs.component';

describe('ArmadaTabsComponent', () => {
  let fixture: ComponentFixture<ArmadaTabsComponent>;

  /**
   * Draws the strip for a reader.
   *
   * @param capabilities - What they hold there.
   * @param roles - The role labels they hold there.
   */
  function render(
    capabilities: string[] = [],
    roles: string[] = [],
    chatEnabled = false,
  ): void {
    TestBed.configureTestingModule({
      imports: [ArmadaTabsComponent],
      providers: [
        provideRouter([]),
        {
          provide: FleetConfigurationService,
          useValue: {
            getFeatures: () => of({ ...FLEET_FEATURES_DISABLED, chatEnabled }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ArmadaTabsComponent);
    fixture.componentRef.setInput(
      'vm',
      armadaTabsVmOf(resolvedArmada(capabilities, roles)),
    );
    fixture.detectChanges();
  }

  /**
   * The tabs offered, as label and address.
   *
   * @returns Each tab.
   */
  function tabs(): [string, string | null][] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(tab => [String(tab.textContent).trim(), tab.getAttribute('href')]);
  }

  it('builds its view model from the resolved Armada', () => {
    expect(
      armadaTabsVmOf(resolvedArmada(['armada.manage'], ['OWNER'])),
    ).toEqual({
      armadaId: 'armada-1',
      communitySlug: 'united-federation-alliance',
      platformSegment: 'pc',
      armadaSlug: 'sol-armada',
      capabilities: ['armada.manage'],
      roles: ['OWNER'],
    });
  });

  it('offers a way into chat, last, to whoever takes part while it is on (FC-033)', () => {
    render(['chat.post'], [], true);
    expect(tabs().at(-1)).toEqual(['Chat', '/chat/armadas/armada-1']);

    TestBed.resetTestingModule();
    render([], ['OFFICER'], true);
    expect(tabs().at(-1)?.[0]).toBe('Chat');

    TestBed.resetTestingModule();
    render([], [], true);
    expect(tabs().at(-1)?.[0]).toBe('History');

    TestBed.resetTestingModule();
    render(['chat.post']);
    expect(tabs().at(-1)?.[0]).toBe('History');
  });

  it('offers anybody the Overview, the News and the History', () => {
    render();

    expect(tabs()).toEqual([
      ['Overview', ARMADA_HREF],
      ['News', `${ARMADA_HREF}/news`],
      ['Activity', `${ARMADA_HREF}/activity`],
      ['Events', `${ARMADA_HREF}/events`],
      ['History', `${ARMADA_HREF}/history`],
    ]);
  });

  it('offers the Requests to an armada.manage holder', () => {
    render(['armada.manage']);

    expect(tabs().map(([label]) => label)).toEqual([
      'Overview',
      'News',
      'Activity',
      'Events',
      'History',
      'Requests',
    ]);
    expect(tabs()[5][1]).toBe(`${ARMADA_HREF}/requests`);
  });

  it('offers Manage to its Owner and Admins', () => {
    render([], ['ADMIN']);

    expect(tabs()[5]).toEqual(['Manage', `${ARMADA_HREF}/manage`]);
  });

  it('offers Manage to nobody else', () => {
    render([], ['OFFICER']);

    expect(tabs()).toHaveLength(5);
  });
});
