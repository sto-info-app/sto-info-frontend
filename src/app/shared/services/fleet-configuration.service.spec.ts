import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import {
  FLEET_FEATURES_DISABLED,
  FleetConfiguration,
  FleetFeatureState,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetConfigurationService } from './fleet-configuration.service';

describe('FleetConfigurationService', () => {
  let service: FleetConfigurationService;
  let httpMock: HttpTestingController;

  const CONFIGURATION: FleetConfiguration = {
    features: {
      isEnabled: true,
      registrationEnabled: true,
      importsEnabled: false,
      chatEnabled: true,
    },
    policy: {
      chatMemberHistoryHours: 4,
      chatTranscriptHistoryDays: 7,
      customChannelLimit: 3,
      chatRetentionDays: 45,
      importSourceRetentionDays: 180,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FleetConfigurationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(FleetConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the configuration from the server', () => {
    let result: FleetConfiguration | null | undefined;
    service.getConfiguration().subscribe(value => (result = value));

    httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush(CONFIGURATION);

    expect(result).toEqual(CONFIGURATION);
  });

  /**
   * The answer changes when an administrator throws a switch, not between two
   * components rendering, so asking once is what keeps this cheap enough for
   * any component to depend on.
   */
  it('asks the server once however many callers there are', () => {
    service.getConfiguration().subscribe();
    service.getFeatures().subscribe();
    service.getConfiguration().subscribe();

    httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush(CONFIGURATION);
  });

  describe('getFeatures', () => {
    /**
     * A template has to render before the request comes back, and an answer of
     * "off" is the one that hides a control rather than showing one that
     * flickers away a moment later.
     */
    it('reports everything off before the server answers', () => {
      const emitted: FleetFeatureState[] = [];
      service.getFeatures().subscribe(features => emitted.push(features));

      expect(emitted).toEqual([FLEET_FEATURES_DISABLED]);

      httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush(CONFIGURATION);

      expect(emitted).toEqual([
        FLEET_FEATURES_DISABLED,
        CONFIGURATION.features,
      ]);
    });

    /**
     * Errs towards hiding a control the server would refuse rather than
     * offering one that does not work: a settings toggle that cannot be saved
     * has nothing to explain.
     */
    it('reports everything off when the request fails', () => {
      const emitted: FleetFeatureState[] = [];
      service.getFeatures().subscribe(features => emitted.push(features));

      httpMock
        .expectOne(API_URLS.FLEET_CONFIGURATION)
        .error(new ProgressEvent('network error'));

      expect(emitted).toEqual([
        FLEET_FEATURES_DISABLED,
        FLEET_FEATURES_DISABLED,
      ]);
    });

    it('reports null configuration as everything off', () => {
      let result: FleetFeatureState | undefined;
      service.getFeatures().subscribe(features => (result = features));

      httpMock
        .expectOne(API_URLS.FLEET_CONFIGURATION)
        .error(new ProgressEvent('network error'));

      expect(result).toEqual(FLEET_FEATURES_DISABLED);
    });
  });

  describe('isOffered', () => {
    /**
     * A link that appears and then disappears is worse than one that
     * arrives a moment late, so nothing is offered until the answer is in.
     */
    it('offers nothing before the server answers', () => {
      const emitted: boolean[] = [];
      service.isOffered().subscribe(offered => emitted.push(offered));

      expect(emitted).toEqual([false]);

      httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush(CONFIGURATION);

      expect(emitted).toEqual([false, true]);
    });

    it('offers the section when the server says it is on', () => {
      let result: boolean | undefined;
      service.isOffered().subscribe(offered => (result = offered));

      httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush(CONFIGURATION);

      expect(result).toBe(true);
    });

    /**
     * The one answer that takes an entry away. A switched-off section has
     * nothing behind its link worth reaching.
     */
    it('offers nothing when the server says the feature is off', () => {
      const emitted: boolean[] = [];
      service.isOffered().subscribe(offered => emitted.push(offered));

      httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush({
        ...CONFIGURATION,
        features: { ...CONFIGURATION.features, isEnabled: false },
      });

      expect(emitted).toEqual([false]);
    });

    /**
     * The opposite reading of the same failure from `getFeatures`, and
     * deliberately so: a link has a page behind it that explains an outage,
     * where a control that cannot be saved has nothing to explain.
     */
    it('keeps offering the section when the request fails', () => {
      let result: boolean | undefined;
      service.isOffered().subscribe(offered => (result = offered));

      httpMock
        .expectOne(API_URLS.FLEET_CONFIGURATION)
        .error(new ProgressEvent('network error'));

      expect(result).toBe(true);
    });

    /**
     * Two identical answers would be two renders of the same navigation,
     * and the second one has nothing to say.
     */
    it('does not repeat an answer it has already given', () => {
      const emitted: boolean[] = [];
      service.isOffered().subscribe(offered => emitted.push(offered));

      httpMock.expectOne(API_URLS.FLEET_CONFIGURATION).flush({
        ...CONFIGURATION,
        features: { ...CONFIGURATION.features, isEnabled: false },
      });

      expect(emitted).toHaveLength(1);
    });
  });
});
