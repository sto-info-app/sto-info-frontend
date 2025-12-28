import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let routingServiceSpy: jest.Mocked<RoutingService>;

  beforeEach(() => {
    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/test'),
    } as unknown as jest.Mocked<RoutingService>;

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map(), data: {} },
            queryParams: of({}),
          },
        },
        { provide: RoutingService, useValue: routingServiceSpy },
      ],
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dynamic theme data', () => {
    expect(component.dataCascade).toBeTruthy();
    expect(component.themePanel2RandomText).toBeTruthy();
  });

  describe('Scroll functionality', () => {
    it('should toggle scroll button based on scroll position', () => {
      // Mock scrollY
      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: 150,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(true);

      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: 50,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(false);
    });

    it('should handle undefined scrollY', () => {
      Object.defineProperty(globalThis, 'scrollY', {
        writable: true,
        value: undefined,
      });

      component.toggleScrollTopButton();
      expect(component.showScrollButton).toBe(false);
    });

    it('should scroll to top when scrollToTop is called', () => {
      const scrollToSpy = jest.fn();
      Object.defineProperty(globalThis, 'scrollTo', {
        writable: true,
        value: scrollToSpy,
      });

      component.scrollToTop();
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });

    it('should add scroll event listener on init', () => {
      const addEventListenerSpy = jest.spyOn(globalThis, 'addEventListener');
      component.ngAfterViewInit();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        component.scrollCallbackFunction,
      );
    });

    it('should remove scroll event listener on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(
        globalThis,
        'removeEventListener',
      );
      component.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        component.scrollCallbackFunction,
      );
    });

    it('should call toggleScrollTopButton via scrollCallbackFunction', () => {
      const spy = jest.spyOn(component, 'toggleScrollTopButton');
      component.scrollCallbackFunction();
      expect(spy).toHaveBeenCalled();
    });
  });

  it('should get route link', () => {
    expect(component.getRouteLink('test')).toBe('/test');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('test');
  });
});
