import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { StorytimeTargetType } from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SearchService],
    });

    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // Finding something to read is the least private thing anybody does here.
  it('searches without a token', async () => {
    const results = firstValueFrom(service.search('voyager'));

    const request = httpMock.expectOne(
      r => r.url === API_URLS.STORYTIME_SEARCH,
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.params.get('q')).toBe('voyager');
    request.flush({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      countsByType: {},
    });

    await expect(results).resolves.toBeDefined();
  });

  it('limits the search to the kinds asked for', async () => {
    const results = firstValueFrom(
      service.search('voyager', {
        types: [StorytimeTargetType.STORY, StorytimeTargetType.ARC],
      }),
    );

    const request = httpMock.expectOne(
      r => r.url === API_URLS.STORYTIME_SEARCH,
    );
    expect(request.request.params.get('types')).toBe('STORY,ARC');
    request.flush({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      countsByType: {},
    });

    await expect(results).resolves.toBeDefined();
  });

  it('asks for the page wanted', async () => {
    const results = firstValueFrom(
      service.search('voyager', { page: 3, pageSize: 5 }),
    );

    const request = httpMock.expectOne(
      r => r.url === API_URLS.STORYTIME_SEARCH,
    );
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('pageSize')).toBe('5');
    request.flush({
      items: [],
      total: 0,
      page: 3,
      pageSize: 5,
      countsByType: {},
    });

    await expect(results).resolves.toBeDefined();
  });

  // An empty filter is not a filter, and sending one would narrow the search
  // to nothing.
  it('sends no filters when none were chosen', async () => {
    const results = firstValueFrom(service.search('voyager', { types: [] }));

    const request = httpMock.expectOne(
      r => r.url === API_URLS.STORYTIME_SEARCH,
    );
    expect(request.request.params.has('types')).toBe(false);
    expect(request.request.params.has('page')).toBe(false);
    request.flush({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      countsByType: {},
    });

    await expect(results).resolves.toBeDefined();
  });

  it('reads what a member has published', async () => {
    const work = firstValueFrom(service.getCreatorWork('user-1'));

    httpMock
      .expectOne(`${API_URLS.STORYTIME_CREATORS}/user-1`)
      .flush({ stories: [], arcs: [] });

    await expect(work).resolves.toEqual({ stories: [], arcs: [] });
  });
});
