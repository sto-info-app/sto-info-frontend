import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { BannerAdminComponent } from './banner-admin.component';

describe('BannerAdminComponent', () => {
  let component: BannerAdminComponent;
  let fixture: ComponentFixture<BannerAdminComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NotificationService,
      'getAllBannersForAdmin' | 'createBanner' | 'updateBanner' | 'deleteBanner'
    >
  >;

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

  beforeEach(async () => {
    serviceSpy = {
      getAllBannersForAdmin: jest.fn(() => of([banner])),
      createBanner: jest.fn(() => of(banner)),
      updateBanner: jest.fn(() => of(banner)),
      deleteBanner: jest.fn(() => of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [BannerAdminComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerAdminComponent);
    component = fixture.componentInstance;
  });

  it('loads banners on init', () => {
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
    expect(component.isLoading).toBe(false);
  });

  it('handles empty banner datasets', () => {
    serviceSpy.getAllBannersForAdmin.mockReturnValueOnce(of([]));

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.banners).toEqual([]);
  });

  it('handles malformed banner payloads without hanging loading', () => {
    serviceSpy.getAllBannersForAdmin.mockReturnValueOnce(
      of(null as unknown as Banner[]),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.banners).toEqual([]);
  });

  it('clears loading when banner request hangs', () => {
    serviceSpy.getAllBannersForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading banners is taking longer than expected. Please try again.',
    );
  });

  it('creates a banner from a valid form', () => {
    fixture.detectChanges();
    component.form.patchValue({ message: 'Hello' });
    component.save();
    expect(serviceSpy.createBanner).toHaveBeenCalled();
  });

  it('switches to update mode when editing', () => {
    fixture.detectChanges();
    component.edit(banner);
    expect(component.editingId).toBe('b1');
    component.save();
    expect(serviceSpy.updateBanner).toHaveBeenCalledWith(
      'b1',
      expect.anything(),
    );
  });

  it('deletes a banner after confirmation', () => {
    jest.spyOn(globalThis, 'confirm').mockReturnValue(true);
    fixture.detectChanges();
    component.remove(banner);
    expect(serviceSpy.deleteBanner).toHaveBeenCalledWith('b1');
  });
});
