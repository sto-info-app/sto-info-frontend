import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SideBarComponent } from './side-bar.component';

describe('SideBarComponent', () => {
  let component: SideBarComponent;
  let fixture: ComponentFixture<SideBarComponent>;
  let routingServiceSpy: jest.Mocked<RoutingService>;

  beforeEach(() => {
    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/test'),
    } as unknown as jest.Mocked<RoutingService>;

    TestBed.configureTestingModule({
      imports: [SideBarComponent],
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
    fixture = TestBed.createComponent(SideBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with theme text', () => {
    expect(component.themePanel6RandomText).toBeTruthy();
  });

  it('should get route link', () => {
    expect(component.getRouteLink('test')).toBe('/test');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('test');
  });

  describe('onResize', () => {
    const createMockEvent = (height: number): Event => {
      const mockElement = {
        getBoundingClientRect: () => ({ height }),
      } as HTMLElement;

      return {
        target: mockElement,
      } as unknown as Event;
    };

    const resizeCases = [
      {
        height: 800,
        panel5: false,
        panel7: false,
        panel10: false,
        panel8: false,
      },
      {
        height: 900,
        panel5: true,
        panel7: false,
        panel10: false,
        panel8: false,
      },
      {
        height: 1200,
        panel5: true,
        panel7: true,
        panel10: false,
        panel8: false,
      },
      {
        height: 1500,
        panel5: true,
        panel7: true,
        panel10: true,
        panel8: false,
      },
      { height: 1800, panel5: true, panel7: true, panel10: true, panel8: true },
    ];

    test.each(resizeCases)(
      'should set panel visibility for height $height',
      ({ height, panel5, panel7, panel10, panel8 }) => {
        const event = createMockEvent(height);
        component.onResize(event);

        expect(component.isPanel5Hidden).toBe(panel5);
        expect(component.isPanel7Hidden).toBe(panel7);
        expect(component.isPanel10Hidden).toBe(panel10);
        expect(component.isPanel8Hidden).toBe(panel8);
      },
    );

    it('should handle null target', () => {
      const event = { target: null } as Event;
      component.onResize(event);

      expect(component.isPanel5Hidden).toBe(false);
      expect(component.isPanel7Hidden).toBe(false);
      expect(component.isPanel10Hidden).toBe(false);
      expect(component.isPanel8Hidden).toBe(false);
    });
  });
});
