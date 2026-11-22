import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  FLEET_FEATURES_DISABLED,
  FleetConfiguration,
} from 'src/app/models/fleet.models';
import { StorytimeAvailability } from 'src/app/models/storytime.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { HelpFeaturesService } from './help-features.service';

describe('HelpFeaturesService (FC-049)', () => {
  /**
   * Reads the switches with Storytime and the Fleet configuration as given.
   *
   * @param storytime Where Storytime stands.
   * @param fleet The Fleet configuration, or null when it could not be read.
   * @returns The switches Help sees.
   */
  const featuresFor = (
    storytime: StorytimeAvailability,
    fleet: Partial<FleetConfiguration['features']> | null,
  ) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: StorytimeService,
          useValue: { getAvailability: () => of(storytime) },
        },
        {
          provide: FleetConfigurationService,
          useValue: {
            getConfiguration: () =>
              of(
                fleet === null
                  ? null
                  : { features: { ...FLEET_FEATURES_DISABLED, ...fleet } },
              ),
          },
        },
      ],
    });

    return firstValueFrom(TestBed.inject(HelpFeaturesService).features());
  };

  it('reads Storytime as Storytime reads itself', async () => {
    await expect(featuresFor('UNAVAILABLE', {})).resolves.toEqual(
      expect.objectContaining({ STORYTIME: 'UNAVAILABLE' }),
    );
  });

  it('reads Fleet Community and chat from the Fleet configuration', async () => {
    await expect(
      featuresFor('ENABLED', { isEnabled: true, chatEnabled: true }),
    ).resolves.toEqual({
      STORYTIME: 'ENABLED',
      FLEET: 'ENABLED',
      CHAT: 'ENABLED',
    });
    await expect(
      featuresFor('ENABLED', { isEnabled: true, chatEnabled: false }),
    ).resolves.toEqual(
      expect.objectContaining({ FLEET: 'ENABLED', CHAT: 'DISABLED' }),
    );
  });

  // Chat is part of Fleet Community, so it cannot be on without it.
  it('counts chat off whenever Fleet Community is off', async () => {
    await expect(
      featuresFor('ENABLED', { isEnabled: false, chatEnabled: true }),
    ).resolves.toEqual(
      expect.objectContaining({ FLEET: 'DISABLED', CHAT: 'DISABLED' }),
    );
  });

  // A configuration that could not be read has said nothing about either.
  it('counts both unknown when the configuration cannot be read', async () => {
    await expect(featuresFor('ENABLED', null)).resolves.toEqual(
      expect.objectContaining({ FLEET: 'UNAVAILABLE', CHAT: 'UNAVAILABLE' }),
    );
  });
});
