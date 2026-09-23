import { FLEET_LINKS } from './fleet-links';

describe('FLEET_LINKS', () => {
  it('should send the Fleet listing to the directory itself', () => {
    expect(FLEET_LINKS.fleetDirectory()).toEqual(['/fleets']);
  });

  it('should put the Community listing below the directory', () => {
    expect(FLEET_LINKS.communityDirectory()).toEqual([
      '/fleets',
      'communities',
    ]);
  });

  it('should put the Armada listing below the directory', () => {
    expect(FLEET_LINKS.armadaDirectory()).toEqual(['/fleets', 'armadas']);
  });

  it('should address a Community by its slug alone', () => {
    expect(FLEET_LINKS.community('united-federation-alliance')).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
    ]);
  });

  // The Community and the platform are both part of a Fleet's identity: the
  // same name exists separately on each platform, and two Communities may
  // each hold a record of it.
  it('should address a Fleet by Community, platform and slug', () => {
    expect(
      FLEET_LINKS.fleet(
        'united-federation-alliance',
        'pc',
        'starfleet-command',
      ),
    ).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'fleets',
      'pc',
      'starfleet-command',
    ]);
  });

  // Beneath the Fleet they belong to, so an import's address says whose it is.
  it('should address a Fleet’s roster imports beneath the Fleet', () => {
    expect(
      FLEET_LINKS.fleetRosterImports(
        'united-federation-alliance',
        'pc',
        'starfleet-command',
      ),
    ).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'fleets',
      'pc',
      'starfleet-command',
      'imports',
    ]);
  });

  it('should address one roster import beneath the Fleet’s imports', () => {
    expect(
      FLEET_LINKS.fleetRosterImport(
        'united-federation-alliance',
        'pc',
        'starfleet-command',
        'import-1',
      ),
    ).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'fleets',
      'pc',
      'starfleet-command',
      'imports',
      'import-1',
    ]);
  });

  // The same shape as a registered Fleet's, with the reserved segment where
  // the Community's slug would be, so a link to a Fleet is built the same
  // way wherever it comes from.
  it('should address a standalone Fleet under the reserved segment', () => {
    expect(FLEET_LINKS.standaloneFleet('pc', 'starfleet-command')).toEqual([
      '/fleets',
      'communities',
      'standalone',
      'fleets',
      'pc',
      'starfleet-command',
    ]);
  });

  it('should address an Armada by Community, platform and slug', () => {
    expect(
      FLEET_LINKS.armada(
        'united-federation-alliance',
        'xbox',
        'ninth-fleet-armada',
      ),
    ).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'armadas',
      'xbox',
      'ninth-fleet-armada',
    ]);
  });

  // Angular encodes each segment on the way out, so a slug is handed over as
  // it was read. Escaping here would escape it twice.
  it('should pass a segment through untouched', () => {
    expect(FLEET_LINKS.community('a b/c')).toEqual([
      '/fleets',
      'communities',
      'a b/c',
    ]);
  });
});
