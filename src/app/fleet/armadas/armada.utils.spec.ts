import { HIDDEN_FLEET } from 'src/app/fleet/armadas/armada.constants';
import {
  armadaBeta,
  armadaFleet,
  armadaNode,
  armadaStructure,
  HIDDEN_ARMADA_FLEET,
} from 'src/app/fleet/armadas/armada.testing';
import {
  ArmadaActionKind,
  ArmadaFleetRef,
  ArmadaPosition,
} from 'src/app/models/fleet-armada.models';

import {
  describeMove,
  fleetLinkOf,
  fleetNamer,
  fleetsIn,
  placeText,
} from './armada.utils';

const NINTH = armadaFleet('Ninth Fleet');
const TENTH = armadaFleet('Tenth Fleet');

describe('armada utils', () => {
  describe('fleetNamer', () => {
    it('names a Fleet by its name alone when no other shares it', () => {
      const nameOf = fleetNamer([NINTH, TENTH], 'United Federation Alliance');

      expect(nameOf(NINTH)).toBe('Ninth Fleet');
    });

    it('adds the Community when two Fleets share a name', () => {
      const twin: ArmadaFleetRef = { ...NINTH, id: 'fleet-twin' };
      const nameOf = fleetNamer([NINTH, twin], 'United Federation Alliance');

      expect(nameOf(twin)).toBe('Ninth Fleet (United Federation Alliance)');
    });

    it('counts one Fleet named twice, as in a history, as one', () => {
      const nameOf = fleetNamer([NINTH, NINTH], 'United Federation Alliance');

      expect(nameOf(NINTH)).toBe('Ninth Fleet');
    });

    it('says a hidden Fleet is hidden', () => {
      const nameOf = fleetNamer([HIDDEN_ARMADA_FLEET], 'Anyone');

      expect(nameOf(HIDDEN_ARMADA_FLEET)).toBe(HIDDEN_FLEET);
    });
  });

  describe('fleetsIn', () => {
    it('lists the Alpha, then each Beta followed by its Gammas', () => {
      const structure = armadaStructure({
        alpha: armadaNode(NINTH, ArmadaPosition.ALPHA),
        betas: [armadaBeta(TENTH, [HIDDEN_ARMADA_FLEET])],
      });

      expect(fleetsIn(structure)).toEqual([NINTH, TENTH, HIDDEN_ARMADA_FLEET]);
    });

    it('lists nothing for the empty Alpha slot', () => {
      expect(fleetsIn(armadaStructure())).toEqual([]);
    });
  });

  describe('fleetLinkOf', () => {
    it('links a Fleet the reader may see', () => {
      expect(fleetLinkOf(NINTH, 'united-federation-alliance')?.join('/')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet',
      );
    });

    it('links no hidden Fleet', () => {
      expect(fleetLinkOf(HIDDEN_ARMADA_FLEET, 'anywhere')).toBeNull();
    });
  });

  describe('describeMove', () => {
    const nameOf = fleetNamer([NINTH, TENTH], 'United Federation Alliance');

    it.each([
      [
        ArmadaActionKind.PLACED,
        null,
        { position: ArmadaPosition.GAMMA, parent: TENTH },
        'Ninth Fleet joined as Gamma under Tenth Fleet.',
      ],
      [
        ArmadaActionKind.MOVED,
        { position: ArmadaPosition.BETA, parent: null },
        { position: ArmadaPosition.ALPHA, parent: null },
        'Ninth Fleet moved from Beta to Alpha.',
      ],
      [
        ArmadaActionKind.LEFT,
        { position: ArmadaPosition.BETA, parent: null },
        null,
        'Ninth Fleet left; it was Beta.',
      ],
      [
        ArmadaActionKind.REMOVED,
        { position: ArmadaPosition.ALPHA, parent: null },
        null,
        'Ninth Fleet was taken out; it was Alpha.',
      ],
      [
        ArmadaActionKind.CLOSED,
        { position: ArmadaPosition.GAMMA, parent: TENTH },
        null,
        'Ninth Fleet came out on closure; it was Gamma under Tenth Fleet.',
      ],
    ])('puts %s as a sentence', (action, from, to, sentence) => {
      expect(describeMove({ fleet: NINTH, action, from, to }, nameOf)).toBe(
        sentence,
      );
    });
  });

  describe('placeText', () => {
    it('names a place with no parent by its position alone', () => {
      expect(
        placeText({ position: ArmadaPosition.BETA, parent: null }, () => ''),
      ).toBe('Beta');
    });
  });
});
