import { TestBed } from '@angular/core/testing';
import { RoutingService } from './routing.service';

describe('RoutingService', () => {
  let service: RoutingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoutingService],
    });
    service = TestBed.inject(RoutingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLink', () => {
    it('should return "/" for home routes', () => {
      const homeRoutes = ['HOME', '', '/'];
      homeRoutes.forEach(route => {
        const result = service.getLink(route);
        expect(result).toBe('/');
      });
    });

    it('should return "/{route}" for non-home routes', () => {
      const nonHomeRoutes = ['about', 'contact', 'products'];
      nonHomeRoutes.forEach(route => {
        const result = service.getLink(route);
        expect(result).toBe('/' + route);
      });
    });
  });
});
