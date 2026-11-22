import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import {
  ARMADA_HREF,
  armadaBeta,
  armadaFleet,
  armadaRef,
  armadaStructure,
} from 'src/app/fleet/armadas/armada.testing';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';
import { CommunityStructure } from 'src/app/models/fleet-armada.models';

import { CommunityStructurePanelComponent } from './community-structure-panel.component';

const NINTH = armadaFleet('Ninth Fleet');
const TENTH = armadaFleet('Tenth Fleet');

describe('CommunityStructurePanelComponent', () => {
  let fixture: ComponentFixture<CommunityStructurePanelComponent>;
  let service: { communityStructure: jest.Mock };

  /**
   * Draws the panel.
   *
   * @param structure - What the server answers, or an error.
   */
  function render(structure: CommunityStructure | Error): void {
    service = {
      communityStructure: jest.fn(() =>
        structure instanceof Error
          ? throwError(() => structure)
          : of(structure),
      ),
    };
    TestBed.configureTestingModule({
      imports: [CommunityStructurePanelComponent],
      providers: [
        provideRouter([]),
        { provide: FleetArmadaService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(CommunityStructurePanelComponent);
    fixture.componentRef.setInput('vm', {
      communityId: 'community-1',
      communitySlug: 'united-federation-alliance',
      communityName: 'United Federation Alliance',
    });
    fixture.detectChanges();
  }

  /**
   * Finds every element matching a selector.
   *
   * @param selector - The selector.
   * @returns The elements.
   */
  function all(selector: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(selector),
    );
  }

  it('shows nothing for a Community with no Armadas and no Fleets', () => {
    render({ armadas: [], standaloneFleets: [] });

    expect(service.communityStructure).toHaveBeenCalledWith('community-1');
    expect(all('section')).toHaveLength(0);
  });

  it('shows nothing when the structure cannot be read', () => {
    render(new Error('down'));

    expect(all('section')).toHaveLength(0);
  });

  it('shows each Armada as a tree, then the Fleets in none', () => {
    render({
      armadas: [
        {
          armada: armadaRef(),
          structure: armadaStructure({ betas: [armadaBeta(NINTH)] }),
        },
        {
          armada: armadaRef({ id: 'armada-2', allegiance: null }),
          structure: armadaStructure(),
        },
      ],
      standaloneFleets: [TENTH],
    });

    const text = pageText(fixture);

    expect(all('h3 a')[0].getAttribute('href')).toBe(ARMADA_HREF);
    expect(all('.community-structure__facts')).toHaveLength(1);
    expect(text).toContain('Federation');
    expect(all('app-armada-tree')).toHaveLength(2);
    expect(text.indexOf('Ninth Fleet')).toBeLessThan(
      text.indexOf('Fleets not in an Armada'),
    );
    expect(
      all('.community-structure__standalone a')[0].getAttribute('href'),
    ).toBe(
      '/fleets/communities/united-federation-alliance/fleets/pc/tenth-fleet',
    );
  });

  it('says when every Fleet is in an Armada', () => {
    render({
      armadas: [{ armada: armadaRef(), structure: armadaStructure() }],
      standaloneFleets: [],
    });

    expect(pageText(fixture)).toContain('Every Fleet here is in an Armada.');
  });

  it('tells apart Fleets in none that share a name', () => {
    render({
      armadas: [],
      standaloneFleets: [NINTH, { ...NINTH, id: 'fleet-twin', slug: 'twin' }],
    });

    expect(
      all('.community-structure__standalone a').map(link => link.textContent),
    ).toEqual([
      'Ninth Fleet (United Federation Alliance)',
      'Ninth Fleet (United Federation Alliance)',
    ]);
  });
});
