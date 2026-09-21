import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetImageSlot } from './fleet-image.constants';
import { FleetArtworkTarget, FleetImageService } from './fleet-image.service';

describe('FleetImageService', () => {
  let service: FleetImageService;
  let http: HttpTestingController;
  let options: { headers: HttpHeaders } | null;

  const communities = API_URLS.FLEET_COMMUNITIES;

  beforeEach(() => {
    options = { headers: new HttpHeaders({ Authorization: 'Bearer token' }) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getHttpOptionsWithAccessToken: (): {
              headers: HttpHeaders;
            } | null => options,
          },
        },
      ],
    });

    service = TestBed.inject(FleetImageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /**
   * Uploads a picture and returns the request it made.
   *
   * @param target - Whose artwork is being set.
   * @param slot - The banner or the emblem.
   * @returns The intercepted request.
   */
  function upload(
    target: FleetArtworkTarget,
    slot: FleetImageSlot = FleetImageSlot.BANNER,
  ) {
    service
      .upload(target, slot, new Blob(['data']), 'A ship')
      .subscribe({ error: () => undefined });

    return http.expectOne(() => true);
  }

  describe('where each kind of record posts to', () => {
    it('addresses a Community directly', () => {
      const request = upload({ kind: 'COMMUNITY', communityId: 'c-1' });

      expect(request.request.url).toBe(`${communities}/c-1/banner-image`);
      request.flush({});
    });

    it('addresses a Fleet inside its Community', () => {
      const request = upload({
        kind: 'FLEET',
        communityId: 'c-1',
        fleetId: 'f-1',
      });

      expect(request.request.url).toBe(
        `${communities}/c-1/fleets/f-1/banner-image`,
      );
      request.flush({});
    });

    it('addresses an Armada inside its Community', () => {
      const request = upload({
        kind: 'ARMADA',
        communityId: 'c-1',
        armadaId: 'a-1',
      });

      expect(request.request.url).toBe(
        `${communities}/c-1/armadas/a-1/banner-image`,
      );
      request.flush({});
    });

    /*
     * Outside the Community collection entirely, because there is no
     * Community to nest it under and the rule it is held to is a different
     * one: an empty slot is open to anybody signed in, a filled one belongs
     * to whoever filled it.
     */
    it('addresses an unregistered Fleet on its own', () => {
      const request = upload({ kind: 'STANDALONE_FLEET', fleetId: 'f-9' });

      expect(request.request.url).toBe(`${API_URLS.FLEETS}/f-9/banner-image`);
      request.flush({});
    });

    it('names the slot in the path', () => {
      const request = upload(
        { kind: 'COMMUNITY', communityId: 'c-1' },
        FleetImageSlot.EMBLEM,
      );

      expect(request.request.url).toBe(`${communities}/c-1/emblem-image`);
      request.flush({});
    });
  });

  /*
   * The description travels with the picture rather than following in a later
   * save, so a record can never briefly show artwork nobody has described.
   */
  it('sends the description alongside the picture', () => {
    const request = upload({ kind: 'COMMUNITY', communityId: 'c-1' });
    const body = request.request.body as FormData;

    expect(body.get('altText')).toBe('A ship');
    expect(body.get('image')).toBeInstanceOf(Blob);
    request.flush({});
  });

  /*
   * Named for the slot and the encoding, because the server reads the
   * extension when deciding what it was handed.
   */
  it('names the file after the slot it is for', () => {
    const request = upload(
      { kind: 'COMMUNITY', communityId: 'c-1' },
      FleetImageSlot.EMBLEM,
    );
    const body = request.request.body as FormData;

    expect((body.get('image') as File).name).toBe('emblem-image.png');
    request.flush({});
  });

  it('attaches the caller’s token', () => {
    const request = upload({ kind: 'COMMUNITY', communityId: 'c-1' });

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({});
  });

  it('removes a picture with a DELETE to the same address', () => {
    service
      .remove({ kind: 'COMMUNITY', communityId: 'c-1' }, FleetImageSlot.EMBLEM)
      .subscribe();

    const request = http.expectOne(`${communities}/c-1/emblem-image`);

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  /*
   * Nothing is sent without a token. A request that would be refused is not
   * worth making, and the failure a caller sees says what is actually wrong.
   */
  it('sends nothing at all when there is no token', () => {
    options = null;

    let failure: Error | null = null;

    service
      .upload(
        { kind: 'COMMUNITY', communityId: 'c-1' },
        FleetImageSlot.BANNER,
        new Blob(['data']),
        'A ship',
      )
      .subscribe({ error: (error: Error) => (failure = error) });

    expect((failure as unknown as Error).message).toBe('No token found');
    http.expectNone(() => true);
  });
});
