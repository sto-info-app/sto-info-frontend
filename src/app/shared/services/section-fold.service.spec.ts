import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { SectionFoldService } from './section-fold.service';

describe('SectionFoldService', () => {
  let service: SectionFoldService;
  let url: string;

  beforeEach(() => {
    localStorage.clear();
    url = '/fleets/communities/one?page=2#news';

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            get url() {
              return url;
            },
          },
        },
      ],
    });

    service = TestBed.inject(SectionFoldService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('starts with every section open', () => {
    expect(service.isFolded('news')).toBe(false);
  });

  it('remembers a folded section on its page', () => {
    service.setFolded('news', true);

    expect(service.isFolded('news')).toBe(true);
    expect(service.isFolded('events')).toBe(false);
  });

  // A filtered or paged view of a page is still that page.
  it('keys the page by its path alone', () => {
    service.setFolded('news', true);

    expect(
      localStorage.getItem('lcars-folded-sections:/fleets/communities/one'),
    ).toBe('["news"]');
  });

  it('keeps each page to itself', () => {
    service.setFolded('news', true);
    url = '/fleets/communities/two';

    expect(service.isFolded('news')).toBe(false);
  });

  it('forgets a section opened again, and the page once none is folded', () => {
    service.setFolded('news', true);
    service.setFolded('events', true);
    service.setFolded('news', false);

    expect(service.isFolded('news')).toBe(false);
    expect(service.isFolded('events')).toBe(true);

    service.setFolded('events', false);

    expect(
      localStorage.getItem('lcars-folded-sections:/fleets/communities/one'),
    ).toBeNull();
  });

  it('records a section once however often it is folded', () => {
    service.setFolded('news', true);
    service.setFolded('news', true);

    expect(
      localStorage.getItem('lcars-folded-sections:/fleets/communities/one'),
    ).toBe('["news"]');
  });

  it.each([
    ['not JSON', '{'],
    ['not a list', '{"news":true}'],
  ])('treats an entry that is %s as nothing folded', (_case, stored) => {
    localStorage.setItem(
      'lcars-folded-sections:/fleets/communities/one',
      stored,
    );

    expect(service.isFolded('news')).toBe(false);
  });

  it('ignores anything in the list that is not a key', () => {
    localStorage.setItem(
      'lcars-folded-sections:/fleets/communities/one',
      '[1, null, "news"]',
    );

    expect(service.isFolded('news')).toBe(true);
  });

  // Storage that is full or refused must not fail the page.
  it('carries on when storage refuses a write', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => service.setFolded('news', true)).not.toThrow();
    expect(service.isFolded('news')).toBe(false);
  });

  it('carries on when storage refuses a removal', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => service.setFolded('news', false)).not.toThrow();
  });

  it('reads nothing folded when storage refuses a read', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(service.isFolded('news')).toBe(false);
  });
});
