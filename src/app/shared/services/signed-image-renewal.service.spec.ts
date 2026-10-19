import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  TestBed,
  fakeAsync,
  flushMicrotasks,
  tick,
} from '@angular/core/testing';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import {
  MAX_RENEWED_ADDRESSES,
  RENEWAL_GATHER_MS,
  SignedImageRenewalService,
  isExpiredSignedAddress,
} from './signed-image-renewal.service';

const CDN = 'https://cdn.example.test/cdn-cgi/imagedelivery/hash-1';
const DIRECT = 'https://imagedelivery.net/hash-1';
/** 1 January 2026: long gone. */
const PAST = 1767225600;
/** 1 January 2099: a long way off. */
const FUTURE = 4070908800;

/**
 * A signed address.
 *
 * @param root - Everything before the image ID.
 * @param imageId - The image.
 * @param exp - Its expiry, in seconds.
 * @returns The address.
 */
function signed(root: string, imageId: string, exp: number): string {
  return `${root}/${imageId}/public?exp=${exp}&sig=${'a'.repeat(64)}`;
}

describe('isExpiredSignedAddress', () => {
  const now = Date.UTC(2026, 9, 19, 18);

  it.each([
    ['on the custom domain', signed(CDN, 'image-1', PAST)],
    ['on imagedelivery.net', signed(DIRECT, 'image-1', PAST)],
    ['expiring this very moment', signed(CDN, 'image-1', now / 1000)],
  ])('knows an expired signed address %s', (_case, address) => {
    expect(isExpiredSignedAddress(address, now)).toBe(true);
  });

  it.each([
    ['one still in date', signed(CDN, 'image-1', FUTURE)],
    ['an unsigned address', `${CDN}/image-1/public`],
    ['an address with no signature', `${CDN}/image-1/public?exp=${PAST}`],
    ['an expiry that is not a number', `${CDN}/image-1/public?exp=1e9&sig=a`],
    ['another site', `https://example.test/image-1/public?exp=${PAST}&sig=a`],
    ['something that is not an address', 'not an address'],
  ])('leaves alone %s', (_case, address) => {
    expect(isExpiredSignedAddress(address, now)).toBe(false);
  });
});

describe('SignedImageRenewalService', () => {
  let service: SignedImageRenewalService;
  let httpMock: HttpTestingController;
  let images: HTMLImageElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SignedImageRenewalService);
    httpMock = TestBed.inject(HttpTestingController);
    images = [];
    service.start();
  });

  afterEach(() => {
    service.stop();
    images.forEach(image => image.remove());
    httpMock.verify();
  });

  /**
   * A picture on the page, with its own error handling as a component
   * would bind it.
   *
   * @param address - Its address.
   * @returns The picture, and its own error handler.
   */
  function picture(address: string): {
    image: HTMLImageElement;
    ownHandler: jest.Mock;
  } {
    const image = document.createElement('img');
    const ownHandler = jest.fn();

    image.src = address;
    image.addEventListener('error', ownHandler);
    document.body.appendChild(image);
    images.push(image);

    return { image, ownHandler };
  }

  /**
   * Fails a picture's load, as the browser would.
   *
   * @param image - The picture.
   */
  function fail(image: HTMLImageElement): void {
    image.dispatchEvent(new Event('error'));
  }

  /**
   * Answers the renewal request.
   *
   * @param addresses - What each address became.
   * @returns The addresses that were asked about.
   */
  function answer(addresses: (string | null)[]): string[] {
    tick(RENEWAL_GATHER_MS);

    const request = httpMock.expectOne(API_URLS.RENEW_IMAGE_ADDRESSES);

    expect(request.request.method).toBe('POST');
    request.flush({ addresses });
    flushMicrotasks();

    return (request.request.body as { addresses: string[] }).addresses;
  }

  it('tries a picture again at its renewed address, holding back its own error handling', fakeAsync(() => {
    const old = signed(CDN, 'image-1', PAST);
    const renewed = signed(CDN, 'image-1', FUTURE);
    const { image, ownHandler } = picture(old);

    fail(image);

    expect(answer([renewed])).toEqual([old]);
    expect(image.src).toBe(renewed);
    expect(ownHandler).not.toHaveBeenCalled();
  }));

  it('lets the picture handle the error when the address may not be renewed', fakeAsync(() => {
    const { image, ownHandler } = picture(signed(CDN, 'image-1', PAST));

    fail(image);
    answer([null]);

    expect(ownHandler).toHaveBeenCalledTimes(1);
  }));

  it('lets the picture handle the error when the renewed address fails too', fakeAsync(() => {
    const renewed = signed(CDN, 'image-1', FUTURE);
    const { image, ownHandler } = picture(signed(CDN, 'image-1', PAST));

    fail(image);
    answer([renewed]);
    fail(image);
    tick(RENEWAL_GATHER_MS);

    expect(ownHandler).toHaveBeenCalledTimes(1);
  }));

  it('asks again after a failed request', fakeAsync(() => {
    const old = signed(CDN, 'image-1', PAST);
    const first = picture(old);

    fail(first.image);
    tick(RENEWAL_GATHER_MS);
    httpMock
      .expectOne(API_URLS.RENEW_IMAGE_ADDRESSES)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    flushMicrotasks();

    expect(first.ownHandler).toHaveBeenCalledTimes(1);

    const second = picture(old);

    fail(second.image);

    expect(answer([signed(CDN, 'image-1', FUTURE)])).toEqual([old]);
  }));

  it.each([
    ['an address still in date', signed(CDN, 'image-1', FUTURE)],
    ['an unsigned address', `${CDN}/image-1/public`],
    ['a picture from elsewhere', 'https://example.test/picture.png'],
  ])(
    'leaves %s to the picture',
    fakeAsync((_case: string, address: string) => {
      const { image, ownHandler } = picture(address);

      fail(image);
      tick(RENEWAL_GATHER_MS);

      expect(ownHandler).toHaveBeenCalledTimes(1);
    }),
  );

  it('renews the pictures that fail together in one request, each address once', fakeAsync(() => {
    const one = signed(CDN, 'image-1', PAST);
    const two = signed(DIRECT, 'image-2', PAST);
    const pictures = [picture(one), picture(one), picture(two)];

    pictures.forEach(each => fail(each.image));

    expect(
      answer([
        signed(CDN, 'image-1', FUTURE),
        signed(DIRECT, 'image-2', FUTURE),
      ]),
    ).toEqual([one, two]);
    expect(pictures.map(each => each.image.src)).toEqual([
      signed(CDN, 'image-1', FUTURE),
      signed(CDN, 'image-1', FUTURE),
      signed(DIRECT, 'image-2', FUTURE),
    ]);
  }));

  it(`asks about at most ${MAX_RENEWED_ADDRESSES} addresses a request`, fakeAsync(() => {
    const count = MAX_RENEWED_ADDRESSES + 1;

    for (let index = 0; index < count; index++) {
      fail(picture(signed(CDN, `image-${index}`, PAST)).image);
    }

    tick(RENEWAL_GATHER_MS);

    const requests = httpMock.match(API_URLS.RENEW_IMAGE_ADDRESSES);

    expect(
      requests.map(
        each => (each.request.body as { addresses: string[] }).addresses.length,
      ),
    ).toEqual([MAX_RENEWED_ADDRESSES, 1]);
    requests.forEach(each =>
      each.flush({
        addresses: (each.request.body as { addresses: string[] }).addresses,
      }),
    );
    flushMicrotasks();
  }));

  it('leaves a picture alone once the page has moved it to another address', fakeAsync(() => {
    const { image, ownHandler } = picture(signed(CDN, 'image-1', PAST));

    fail(image);
    image.src = `${CDN}/other/public`;
    answer([signed(CDN, 'image-1', FUTURE)]);

    expect(image.src).toBe(`${CDN}/other/public`);
    expect(ownHandler).not.toHaveBeenCalled();
  }));

  it('listens once, however often it is started', fakeAsync(() => {
    service.start();

    const { image } = picture(signed(CDN, 'image-1', PAST));

    fail(image);
    answer([signed(CDN, 'image-1', FUTURE)]);
  }));

  it('stops listening', fakeAsync(() => {
    service.stop();

    const { image, ownHandler } = picture(signed(CDN, 'image-1', PAST));

    fail(image);
    tick(RENEWAL_GATHER_MS);

    expect(ownHandler).toHaveBeenCalledTimes(1);
  }));

  it('leaves alone anything that is not a picture', fakeAsync(() => {
    const video = document.createElement('video');
    const ownHandler = jest.fn();

    video.src = signed(CDN, 'image-1', PAST);
    video.addEventListener('error', ownHandler);
    document.body.appendChild(video);

    video.dispatchEvent(new Event('error'));
    tick(RENEWAL_GATHER_MS);
    video.remove();

    expect(ownHandler).toHaveBeenCalledTimes(1);
  }));
});
