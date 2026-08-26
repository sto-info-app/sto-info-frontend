import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CharacterService } from './character.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const CHARACTER_ID = 'character-1';
const CHAPTER_ID = 'chapter-1';

describe('CharacterService', () => {
  let service: CharacterService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CharacterService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(CharacterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    // A Character is only reachable through a Story that is itself readable,
    // and the URL mirrors that.
    it('lists the cast through the Story slug', async () => {
      const cast = firstValueFrom(service.getCharacters('a-story'));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_STORIES}/a-story/characters`,
      );
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(cast).resolves.toEqual([]);
    });

    it('reads one Character with their appearances', async () => {
      const result = firstValueFrom(
        service.getCharacter('a-story', 'captain-shran'),
      );

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_STORIES}/a-story/characters/captain-shran`,
        )
        .flush({ character: { slug: 'captain-shran' }, appearsIn: [] });

      await expect(result).resolves.toEqual({
        character: { slug: 'captain-shran' },
        appearsIn: [],
      });
    });

    // A slug with a space or a slash would otherwise break the path.
    it('encodes an awkward slug', async () => {
      const result = firstValueFrom(service.getCharacter('a-story', 'a b'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a-story/characters/a%20b`)
        .flush({ character: {}, appearsIn: [] });

      await expect(result).resolves.toBeDefined();
    });
  });

  describe('managing', () => {
    it('lists the cast of a Story the caller owns', async () => {
      const cast = firstValueFrom(service.getMyCharacters(STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/characters`,
      );
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(cast).resolves.toEqual([]);
    });

    it('retrieves one Character for editing', async () => {
      const character = firstValueFrom(service.getMyCharacter(CHARACTER_ID));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${CHARACTER_ID}`)
        .flush({ id: CHARACTER_ID });

      await expect(character).resolves.toEqual({ id: CHARACTER_ID });
    });

    it('creates a Character', async () => {
      const created = firstValueFrom(
        service.createCharacter(STORY_ID, { name: 'Captain Shran' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/characters`,
      );
      expect(request.request.body).toEqual({ name: 'Captain Shran' });
      request.flush({ id: CHARACTER_ID });

      await expect(created).resolves.toBeDefined();
    });

    it('updates a Character', async () => {
      const updated = firstValueFrom(
        service.updateCharacter(CHARACTER_ID, { rank: 'Captain', version: 2 }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${CHARACTER_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ rank: 'Captain', version: 2 });
      request.flush({ id: CHARACTER_ID });

      await expect(updated).resolves.toBeDefined();
    });

    it('reorders the cast', async () => {
      const reordered = firstValueFrom(
        service.reorderCharacters(STORY_ID, ['b', 'a']),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/characters/reorder`,
      );
      expect(request.request.body).toEqual({ characterIds: ['b', 'a'] });
      request.flush([]);

      await expect(reordered).resolves.toEqual([]);
    });

    it('deletes a Character', async () => {
      const removed = firstValueFrom(service.deleteCharacter(CHARACTER_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHARACTERS}/${CHARACTER_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await expect(removed).resolves.toBeNull();
    });
  });

  describe('appearances', () => {
    it('lists who appears in a Chapter', async () => {
      const cast = firstValueFrom(service.getAppearances(CHAPTER_ID));

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/characters`,
        )
        .flush([]);

      await expect(cast).resolves.toEqual([]);
    });

    it('sets who appears in a Chapter', async () => {
      const saved = firstValueFrom(
        service.setAppearances(CHAPTER_ID, [
          { characterId: CHARACTER_ID, isPrimary: true },
        ]),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/characters`,
      );
      expect(request.request.body).toEqual({
        appearances: [{ characterId: CHARACTER_ID, isPrimary: true }],
      });
      request.flush([]);

      await expect(saved).resolves.toEqual([]);
    });

    // An empty list is a valid answer and clears the cast.
    it('clears the cast', async () => {
      const saved = firstValueFrom(service.setAppearances(CHAPTER_ID, []));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CHAPTERS}/${CHAPTER_ID}/characters`,
      );
      expect(request.request.body).toEqual({ appearances: [] });
      request.flush([]);

      await expect(saved).resolves.toEqual([]);
    });
  });

  // Managing a cast is something only a signed-in creator does, so failing is
  // honest; sending the request anyway would only earn a 401.
  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each<[string, () => Observable<unknown>]>([
      ['getMyCharacters', () => service.getMyCharacters(STORY_ID)],
      ['getMyCharacter', () => service.getMyCharacter(CHARACTER_ID)],
      [
        'createCharacter',
        () => service.createCharacter(STORY_ID, { name: 'Shran' }),
      ],
      [
        'updateCharacter',
        () => service.updateCharacter(CHARACTER_ID, { rank: 'Captain' }),
      ],
      ['reorderCharacters', () => service.reorderCharacters(STORY_ID, ['a'])],
      ['deleteCharacter', () => service.deleteCharacter(CHARACTER_ID)],
      ['getAppearances', () => service.getAppearances(CHAPTER_ID)],
      ['setAppearances', () => service.setAppearances(CHAPTER_ID, [])],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    // Reading a published Story's cast needs no account at all.
    it('still lists a public cast', async () => {
      const cast = firstValueFrom(service.getCharacters('a-story'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a-story/characters`)
        .flush([]);

      await expect(cast).resolves.toEqual([]);
    });
  });
});
