import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  FleetCommunityCard,
  FleetDirectoryPage,
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
  FleetRecruitmentState,
  StoArmadaCard,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetDirectoryService } from './fleet-directory.service';

describe('FleetDirectoryService', () => {
  let service: FleetDirectoryService;
  let httpMock: HttpTestingController;

  const emptyPage: FleetDirectoryPage<never> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FleetDirectoryService],
    });

    service = TestBed.inject(FleetDirectoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listCommunities', () => {
    it('should ask for the Community listing with no parameters by default', () => {
      let received: FleetDirectoryPage<FleetCommunityCard> | undefined;

      service.listCommunities().subscribe(page => (received = page));

      const request = httpMock.expectOne(API_URLS.FLEET_COMMUNITIES);

      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);

      request.flush(emptyPage);

      expect(received).toEqual(emptyPage);
    });

    it('should send the search, status, paging, sort and recruitment filters', () => {
      service
        .listCommunities({
          search: 'starfleet',
          status: FleetDirectoryStatusFilter.ANY,
          page: 3,
          pageSize: 40,
          sort: FleetDirectorySort.NEWEST,
          recruitmentState: FleetRecruitmentState.OPEN,
        })
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === API_URLS.FLEET_COMMUNITIES,
      );

      expect(request.request.params.get('search')).toBe('starfleet');
      expect(request.request.params.get('status')).toBe('ANY');
      expect(request.request.params.get('page')).toBe('3');
      expect(request.request.params.get('pageSize')).toBe('40');
      expect(request.request.params.get('sort')).toBe('NEWEST');
      expect(request.request.params.get('recruitmentState')).toBe('OPEN');

      request.flush(emptyPage);
    });
  });

  describe('listFleets', () => {
    it('should ask for the Fleet listing with no parameters by default', () => {
      let received: FleetDirectoryPage<StoFleetCard> | undefined;

      service.listFleets().subscribe(page => (received = page));

      const request = httpMock.expectOne(API_URLS.FLEETS);

      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);

      request.flush(emptyPage);

      expect(received).toEqual(emptyPage);
    });

    it('should send every Fleet filter it was given', () => {
      service
        .listFleets({
          search: 'command',
          sort: FleetDirectorySort.FRESHNESS,
          platformId: 'platform-1',
          recruitmentState: FleetRecruitmentState.APPLICATION,
          allegianceFactionId: 'faction-1',
          withRoster: true,
          freshWithinDays: 30,
        })
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === API_URLS.FLEETS,
      );

      expect(request.request.params.get('search')).toBe('command');
      expect(request.request.params.get('sort')).toBe('FRESHNESS');
      expect(request.request.params.get('platformId')).toBe('platform-1');
      expect(request.request.params.get('recruitmentState')).toBe(
        'APPLICATION',
      );
      expect(request.request.params.get('allegianceFactionId')).toBe(
        'faction-1',
      );
      expect(request.request.params.get('withRoster')).toBe('true');
      expect(request.request.params.get('freshWithinDays')).toBe('30');

      request.flush(emptyPage);
    });

    it('should send withRoster=false rather than dropping it', () => {
      service.listFleets({ withRoster: false }).subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === API_URLS.FLEETS,
      );

      expect(request.request.params.get('withRoster')).toBe('false');

      request.flush(emptyPage);
    });

    it('should not silently drop a zero freshness window', () => {
      service.listFleets({ freshWithinDays: 0 }).subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === API_URLS.FLEETS,
      );

      expect(request.request.params.get('freshWithinDays')).toBe('0');

      request.flush(emptyPage);
    });
  });

  describe('listArmadas', () => {
    it('should ask for the Armada listing with no parameters by default', () => {
      let received: FleetDirectoryPage<StoArmadaCard> | undefined;

      service.listArmadas().subscribe(page => (received = page));

      const request = httpMock.expectOne(API_URLS.ARMADAS);

      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);

      request.flush(emptyPage);

      expect(received).toEqual(emptyPage);
    });

    it('should send the sort and the platform filter', () => {
      service
        .listArmadas({
          sort: FleetDirectorySort.NAME,
          platformId: 'platform-2',
          page: 2,
        })
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === API_URLS.ARMADAS,
      );

      expect(request.request.params.get('sort')).toBe('NAME');
      expect(request.request.params.get('platformId')).toBe('platform-2');
      expect(request.request.params.get('page')).toBe('2');

      request.flush(emptyPage);
    });
  });

  it('should attach no authorisation header, the listings being public', () => {
    service.listFleets().subscribe();

    const request = httpMock.expectOne(API_URLS.FLEETS);

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush(emptyPage);
  });
});
