import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
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
      getBannerByIdForAdmin: jest.fn<
        ReturnType<NotificationService['getBannerByIdForAdmin']>,
        Parameters<NotificationService['getBannerByIdForAdmin']>
      >(() => of(banner)),
      createBanner: jest.fn<
        ReturnType<NotificationService['createBanner']>,
        Parameters<NotificationService['createBanner']>
      >(() => of(banner)),
      updateBanner: jest.fn<
        ReturnType<NotificationService['updateBanner']>,
        Parameters<NotificationService['updateBanner']>
      >(() => of(banner)),
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

  it('ignores stale load timeout after a successful load', async () => {
    routeId = 'b1';
    await configure();

    fixture.detectChanges();
    expect(component.isLoading).toBe(false);

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('returns early in timeout callback when loading is already cleared', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    component.isLoading = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('handles load failure in edit mode', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(
      throwError(() => new Error('load failed')),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load the banner.');
  });

  it('handles save failure in add mode', async () => {
    routeId = null;
    await configure();
    serviceSpy.createBanner.mockReturnValueOnce(
      throwError(() => new Error('save failed')),
    );

    fixture.detectChanges();
    component.form.patchValue({ message: 'Hello' });
    component.save();

    expect(component.isSaving).toBe(false);
    expect(component.errorMessage).toBe('Failed to save the banner.');
  });

  it('builds full create payload values, trims strings and converts dates', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      severity: NotificationSeverity.WARNING,
      title: '  Trimmed Title  ',
      message: 'Hello',
      linkUrl: '  https://example.com  ',
      linkLabel: '  Read more  ',
      dismissible: false,
      active: false,
      startsAt: '2026-01-02T03:04',
      endsAt: '2026-01-03T04:05',
    });
    component.save();

    expect(serviceSpy.createBanner).toHaveBeenCalledWith({
      severity: NotificationSeverity.WARNING,
      title: 'Trimmed Title',
      message: 'Hello',
      linkUrl: 'https://example.com',
      linkLabel: 'Read more',
      dismissible: false,
      active: false,
      startsAt: new Date('2026-01-02T03:04').toISOString(),
      endsAt: new Date('2026-01-03T04:05').toISOString(),
    });
  });

  it('falls back to default create payload values when fields are undefined', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      message: 'Hello',
      severity: undefined as unknown as NotificationSeverity,
      dismissible: undefined as unknown as boolean,
      active: undefined as unknown as boolean,
      title: '   ',
      linkUrl: '   ',
      linkLabel: '   ',
      startsAt: '',
      endsAt: '',
    });
    component.save();

    expect(serviceSpy.createBanner).toHaveBeenCalledWith({
      severity: NotificationSeverity.INFO,
      message: 'Hello',
      dismissible: true,
      active: true,
      title: undefined,
      linkUrl: undefined,
      linkLabel: undefined,
      startsAt: undefined,
      endsAt: undefined,
    });
  });

  it('builds full update payload values and converts dates', async () => {
    routeId = 'b1';
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      severity: NotificationSeverity.WARNING,
      title: '  Banner Title  ',
      message: 'Updated message',
      linkUrl: '  https://example.org  ',
      linkLabel: '  Open link  ',
      dismissible: false,
      active: false,
      startsAt: '2026-02-01T10:11',
      endsAt: '2026-02-02T11:12',
    });
    component.save();

    expect(serviceSpy.updateBanner).toHaveBeenCalledWith('b1', {
      severity: NotificationSeverity.WARNING,
      title: 'Banner Title',
      message: 'Updated message',
      linkUrl: 'https://example.org',
      linkLabel: 'Open link',
      dismissible: false,
      active: false,
      startsAt: new Date('2026-02-01T10:11').toISOString(),
      endsAt: new Date('2026-02-02T11:12').toISOString(),
    });
  });

  it('falls back to default update payload values when fields are undefined', async () => {
    routeId = 'b1';
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      message: 'Updated message',
      severity: undefined as unknown as NotificationSeverity,
      dismissible: undefined as unknown as boolean,
      active: undefined as unknown as boolean,
      title: '   ',
      linkUrl: '   ',
      linkLabel: '   ',
      startsAt: '',
      endsAt: '',
    });
    component.save();

    expect(serviceSpy.updateBanner).toHaveBeenCalledWith('b1', {
      severity: NotificationSeverity.INFO,
      message: 'Updated message',
      dismissible: true,
      active: true,
      title: undefined,
      linkUrl: undefined,
      linkLabel: undefined,
      startsAt: null,
      endsAt: null,
    });
  });

  it('maps valid and invalid input dates while loading existing banner', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(
      of({
        ...banner,
        startsAt: 'invalid-date',
        endsAt: '2026-03-04T05:06:07.000Z',
      }),
    );

    fixture.detectChanges();

    expect(component.form.get('startsAt')?.value).toBe('');
    expect(component.form.get('endsAt')?.value).toBe('2026-03-04T05:06');
  });

  it('maps a null title to an empty title string while loading', async () => {
    routeId = 'b1';
    await configure();
    serviceSpy.getBannerByIdForAdmin.mockReturnValueOnce(
      of({
        ...banner,
        title: null,
      }),
    );

    fixture.detectChanges();

    expect(component.form.get('title')?.value).toBe('');
  });
});
