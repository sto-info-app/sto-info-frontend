import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { BannerAdminFormComponent } from './banner-admin-form.component';

describe('BannerAdminFormComponent', () => {
  let component: BannerAdminFormComponent;
  let fixture: ComponentFixture<BannerAdminFormComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NotificationService,
      'getBannerByIdForAdmin' | 'createBanner' | 'updateBanner'
    >
  >;
  let routeId: string | null;

  const banner: Banner = {
    id: 'b1',
    severity: NotificationSeverity.INFO,
    title: 'T',
    message: 'M',
    linkUrl: null,
    linkLabel: null,
    dismissible: true,
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const configure = async () => {
    serviceSpy = {
      getBannerByIdForAdmin: jest.fn(() => of(banner)),
      createBanner: jest.fn(() => of(banner)),
      updateBanner: jest.fn(() => of(banner)),
    };

    await TestBed.configureTestingModule({
      imports: [BannerAdminFormComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerAdminFormComponent);
    component = fixture.componentInstance;
  };

  it('creates a banner in add mode', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ message: 'Hello' });
    component.save();
    expect(serviceSpy.createBanner).toHaveBeenCalled();
  });

  it('omits empty dates on create', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ message: 'Hello' });
    component.save();
    expect(serviceSpy.createBanner).toHaveBeenCalledWith(
      expect.objectContaining({ startsAt: undefined, endsAt: undefined }),
    );
  });

  it('loads and updates a banner in edit mode', async () => {
    routeId = 'b1';
    await configure();
    const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
    expect(component.isEdit).toBe(true);
    expect(serviceSpy.getBannerByIdForAdmin).toHaveBeenCalledWith('b1');
    component.save();
    expect(serviceSpy.updateBanner).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('sends null dates on update when the window is cleared', async () => {
    routeId = 'b1';
    await configure();
    fixture.detectChanges();
    component.save();
    expect(serviceSpy.updateBanner).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ startsAt: null, endsAt: null }),
    );
  });

  it('does not submit an invalid form', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ message: '' });
    component.save();
    expect(serviceSpy.createBanner).not.toHaveBeenCalled();
  });

  it('handles malformed edit payloads without hanging loading', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(
      of(null as unknown as Banner),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load the banner.');
  });

  it('clears loading when edit banner request hangs', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading banner is taking longer than expected. Please try again.',
    );
  });
});
