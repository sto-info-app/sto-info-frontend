import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReadingList,
  ReadingListDetail,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ReadingListService } from './reading-list.service';

const AUTH_HEADER = 'Bearer token-1';
const LIST_ID = 'list-1';
const OWNER_ID = 'reader-1';
const STORY_ID = 'story-1';

const LIST: ReadingList = {
  id: LIST_ID,
  ownerUserId: OWNER_ID,
  name: 'Klingon favourites',
  slug: 'klingon-favourites',
  description: null,
  isPublic: false,
  itemCount: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const DETAIL: ReadingListDetail = {
  ...LIST,
  items: [
    {
      id: 'item-1',
      targetType: StorytimeTargetType.STORY,
      targetId: STORY_ID,
      title: 'The Long Patrol',
      slug: 'the-long-patrol',
      shortDescription: null,
      note: null,
      orderIndex: 0,
    },
  ],
};

describe('ReadingListService', () => {
  let service: ReadingListService;
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
        ReadingListService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ReadingListService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('lists the reader’s own lists', async () => {
    const lists = firstValueFrom(service.getMyLists());

    const request = httpMock.expectOne(API_URLS.STORYTIME_READING_LISTS);
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush([LIST]);

    await expect(lists).resolves.toEqual([LIST]);
  });

  it('reads one of the reader’s lists', async () => {
    const list = firstValueFrom(service.getList(LIST_ID));

    httpMock
      .expectOne(`${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}`)
      .flush(DETAIL);

    await expect(list).resolves.toEqual(DETAIL);
  });

  // Lets a page show where a Story already sits, rather than letting somebody
  // discover it by adding it again.
  it('reports which lists already hold something', async () => {
    const holding = firstValueFrom(
      service.getListsHolding(StorytimeTargetType.STORY, STORY_ID),
    );

    const request = httpMock.expectOne(
      r =>
        r.url === `${API_URLS.STORYTIME_READING_LISTS}/holding` &&
        r.params.get('targetType') === StorytimeTargetType.STORY &&
        r.params.get('targetId') === STORY_ID,
    );
    request.flush([LIST_ID]);

    await expect(holding).resolves.toEqual([LIST_ID]);
  });

  it('makes a list', async () => {
    const created = firstValueFrom(
      service.createList({ name: 'Klingon favourites', isPublic: true }),
    );

    const request = httpMock.expectOne(API_URLS.STORYTIME_READING_LISTS);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Klingon favourites',
      isPublic: true,
    });
    request.flush(LIST);

    await expect(created).resolves.toEqual(LIST);
  });

  it('changes a list', async () => {
    const updated = firstValueFrom(
      service.updateList(LIST_ID, { isPublic: true }),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}`,
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({ ...LIST, isPublic: true });

    await expect(updated).resolves.toEqual({ ...LIST, isPublic: true });
  });

  it('deletes a list', async () => {
    const deleted = firstValueFrom(service.deleteList(LIST_ID));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(deleted).resolves.toBeNull();
  });

  it('puts something on a list', async () => {
    const detail = firstValueFrom(
      service.addItem(
        LIST_ID,
        StorytimeTargetType.STORY,
        STORY_ID,
        'Worth a second read.',
      ),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}/items`,
    );
    expect(request.request.body).toEqual({
      targetType: StorytimeTargetType.STORY,
      targetId: STORY_ID,
      note: 'Worth a second read.',
    });
    request.flush(DETAIL);

    await expect(detail).resolves.toEqual(DETAIL);
  });

  it('takes something off a list', async () => {
    const detail = firstValueFrom(service.removeItem(LIST_ID, 'item-1'));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}/items/item-1`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(DETAIL);

    await expect(detail).resolves.toEqual(DETAIL);
  });

  // The whole order is sent rather than one move at a time, so it cannot
  // half-apply.
  it('puts a list in order', async () => {
    const detail = firstValueFrom(
      service.reorder(LIST_ID, ['item-2', 'item-1']),
    );

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_READING_LISTS}/${LIST_ID}/order`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ itemIds: ['item-2', 'item-1'] });
    request.flush(DETAIL);

    await expect(detail).resolves.toEqual(DETAIL);
  });

  // A public list is worth sharing only if somebody without an account can
  // open it.
  it('reads somebody’s public lists without a token', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    const lists = firstValueFrom(service.getPublicLists(OWNER_ID));

    const request = httpMock.expectOne(
      `${API_URLS.STORYTIME_CREATORS}/${OWNER_ID}/reading-lists`,
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([LIST]);

    await expect(lists).resolves.toEqual([LIST]);
  });

  it('reads one public list without a token', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    const list = firstValueFrom(
      service.getPublicList(OWNER_ID, 'klingon-favourites'),
    );

    httpMock
      .expectOne(
        `${API_URLS.STORYTIME_CREATORS}/${OWNER_ID}/reading-lists/klingon-favourites`,
      )
      .flush(DETAIL);

    await expect(list).resolves.toEqual(DETAIL);
  });

  it.each([
    ['listing your own', () => service.getMyLists()],
    ['reading one of yours', () => service.getList(LIST_ID)],
    [
      'asking what holds something',
      () => service.getListsHolding(StorytimeTargetType.ARC, 'arc-1'),
    ],
    ['making one', () => service.createList({ name: 'Later' })],
    ['changing one', () => service.updateList(LIST_ID, { name: 'Later' })],
    ['deleting one', () => service.deleteList(LIST_ID)],
    [
      'adding to one',
      () => service.addItem(LIST_ID, StorytimeTargetType.ARC, 'arc-1'),
    ],
    ['removing from one', () => service.removeItem(LIST_ID, 'item-1')],
    ['ordering one', () => service.reorder(LIST_ID, ['item-1'])],
  ])('fails %s without a token', async (_name, act) => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(act())).rejects.toThrow('No token found');
  });
});
