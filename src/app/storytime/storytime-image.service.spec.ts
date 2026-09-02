import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StorytimeImageSlot } from './storytime-image.constants';
import { StorytimeImageService } from './storytime-image.service';

const AUTH_HEADER = 'Bearer token-1';
const TARGET_ID = 'work-1';

describe('StorytimeImageService', () => {
  let service: StorytimeImageService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const image = new Blob(['bytes'], { type: 'image/jpeg' });

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StorytimeImageService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(StorytimeImageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('uploading', () => {
    // The description travels with the picture rather than following in a
    // later save, so a work can never briefly hold artwork nobody described.
    it('sends the image and its description together', async () => {
      const uploaded = firstValueFrom(
        service.upload(
          StorytimeImageSlot.STORY_BANNER,
          TARGET_ID,
          image,
          'The USS Ares at warp',
        ),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${TARGET_ID}/banner-image`,
      );
      const body = request.request.body as FormData;

      expect(request.request.method).toBe('POST');
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      // FormData names the part, so the blob arrives as a File. The name
      // carries the encoding, which is what a server reading the extension
      // needs and what the slot's own rules decided.
      const sent = body.get('image') as File;

      expect(sent.name).toBe('banner-image.jpeg');
      expect(sent.type).toBe('image/jpeg');
      expect(sent.size).toBe(image.size);
      expect(body.get('altText')).toBe('The USS Ares at warp');

      request.flush({ id: TARGET_ID });

      await expect(uploaded).resolves.toEqual({ id: TARGET_ID });
    });

    // Each slot has its own address; a Chapter cover and a Story banner are
    // managed from different collections entirely.
    it.each<[StorytimeImageSlot, string]>([
      [
        StorytimeImageSlot.STORY_PROFILE,
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${TARGET_ID}/profile-image`,
      ],
      [
        StorytimeImageSlot.CHAPTER_COVER,
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${TARGET_ID}/cover-image`,
      ],
      [
        StorytimeImageSlot.CHARACTER_PORTRAIT,
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${TARGET_ID}/portrait-image`,
      ],
      [
        StorytimeImageSlot.ARC_BANNER,
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${TARGET_ID}/banner-image`,
      ],
      [
        StorytimeImageSlot.ARC_PROFILE,
        `${API_URLS.STORYTIME_MANAGE_ARCS}/${TARGET_ID}/profile-image`,
      ],
      [
        StorytimeImageSlot.SPOTLIGHT_OVERRIDE,
        `${API_URLS.STORYTIME_ADMIN_SPOTLIGHT}/${TARGET_ID}/override-image`,
      ],
    ])('posts %s to its own endpoint', async (slot, url) => {
      const uploaded = firstValueFrom(
        service.upload(slot, TARGET_ID, image, 'A picture'),
      );

      httpMock.expectOne(url).flush({ id: TARGET_ID });

      await expect(uploaded).resolves.toEqual({ id: TARGET_ID });
    });
  });

  describe('removing', () => {
    it('asks for the slot to be emptied', async () => {
      const removed = firstValueFrom(
        service.remove(StorytimeImageSlot.CHAPTER_COVER, TARGET_ID),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${TARGET_ID}/cover-image`,
      );

      expect(request.request.method).toBe('DELETE');
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);

      request.flush({ id: TARGET_ID });

      await expect(removed).resolves.toEqual({ id: TARGET_ID });
    });
  });

  // Every artwork change is somebody's own work being altered, so a request
  // with no token is refused here rather than sent and turned away.
  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each<[string, () => Observable<unknown>]>([
      [
        'upload',
        () =>
          service.upload(
            StorytimeImageSlot.STORY_BANNER,
            TARGET_ID,
            image,
            'A picture',
          ),
      ],
      [
        'remove',
        () => service.remove(StorytimeImageSlot.STORY_BANNER, TARGET_ID),
      ],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });
  });
});
