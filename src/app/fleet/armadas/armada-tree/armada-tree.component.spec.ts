import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  armadaBeta,
  armadaFleet,
  armadaNode,
  armadaStructure,
  HIDDEN_ARMADA_FLEET,
} from 'src/app/fleet/armadas/armada.testing';
import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ArmadaNode,
  ArmadaPosition,
  ArmadaStructure,
} from 'src/app/models/fleet-armada.models';

import { ArmadaTreeComponent } from './armada-tree.component';

const NINTH = armadaFleet('Ninth Fleet');
const TENTH = armadaFleet('Tenth Fleet');
const ELEVENTH = armadaFleet('Eleventh Fleet');

describe('ArmadaTreeComponent', () => {
  let fixture: ComponentFixture<ArmadaTreeComponent>;

  /**
   * Draws the tree.
   *
   * @param structure - The Armada's shape.
   * @param manageable - Whether to offer changes.
   */
  function render(structure: ArmadaStructure, manageable = false): void {
    TestBed.configureTestingModule({
      imports: [ArmadaTreeComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ArmadaTreeComponent);
    fixture.componentRef.setInput('structure', structure);
    fixture.componentRef.setInput(
      'communitySlug',
      'united-federation-alliance',
    );
    fixture.componentRef.setInput(
      'communityName',
      'United Federation Alliance',
    );
    fixture.componentRef.setInput('manageable', manageable);
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

  it('shows the empty Alpha slot and says there are no Betas', () => {
    render(armadaStructure());

    const text = pageText(fixture);

    expect(text).toContain('Alpha Empty');
    expect(text).toContain('No Betas yet.');
    expect(all('ul')[1].getAttribute('aria-label')).toBe('Betas, 0 of 3');
  });

  it('nests each Gamma under its Beta, below the Alpha', () => {
    render(
      armadaStructure({
        alpha: armadaNode(NINTH, ArmadaPosition.ALPHA),
        betas: [armadaBeta(TENTH, [ELEVENTH]), armadaBeta(HIDDEN_ARMADA_FLEET)],
      }),
    );

    const alpha = all('.armada-tree__node--alpha')[0];
    const beta = all('.armada-tree__node--beta')[0];

    expect(alpha.textContent).toContain('Alpha');
    expect(alpha.querySelector('a')?.textContent).toBe('Ninth Fleet');
    expect(beta.querySelector('a')?.textContent).toBe('Tenth Fleet');
    expect(
      beta.querySelector('.armada-tree__node--gamma')?.textContent,
    ).toContain('Eleventh Fleet');
    expect(beta.querySelector('ul')?.getAttribute('aria-label')).toBe(
      'Gammas under Tenth Fleet, 1 of 3',
    );
    expect(pageText(fixture)).toContain('Alpha Ninth Fleet since Sep 20, 2026');
  });

  it('names a hidden Fleet without linking it', () => {
    render(armadaStructure({ betas: [armadaBeta(HIDDEN_ARMADA_FLEET)] }));

    expect(all('.armada-tree__fleet--hidden')[0].textContent).toContain(
      'A Fleet you cannot see',
    );
    expect(all('a')).toHaveLength(0);
  });

  it('offers no changes unless asked to', () => {
    render(armadaStructure({ betas: [armadaBeta(TENTH)] }));

    expect(findButton(fixture, 'Move…')).toBeUndefined();
  });

  it('asks to move or remove a Fleet, never a hidden one', () => {
    render(
      armadaStructure({
        betas: [armadaBeta(TENTH), armadaBeta(HIDDEN_ARMADA_FLEET)],
      }),
      true,
    );

    const moved: ArmadaNode[] = [];
    const removed: ArmadaNode[] = [];

    fixture.componentInstance.move.subscribe(node => moved.push(node));
    fixture.componentInstance.remove.subscribe(node => removed.push(node));

    expect(all('.armada-tree__actions')).toHaveLength(1);
    expect(findButton(fixture, 'Move…')?.getAttribute('aria-label')).toBe(
      'Move Tenth Fleet',
    );

    pressButton(fixture, 'Move…');
    pressButton(fixture, 'Remove…');

    expect(moved.map(node => node.fleet)).toEqual([TENTH]);
    expect(removed.map(node => node.fleet)).toEqual([TENTH]);
  });
});
