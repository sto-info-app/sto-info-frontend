import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { BannerAdminListComponent } from './banner-admin-list.component';

describe('BannerAdminListComponent', () => {
  let component: BannerAdminListComponent;
  let fixture: ComponentFixture<BannerAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<NotificationService, 'getAllBannersForAdmin' | 'deleteBanner'>
  >;
  let dialogSpy: jest.Mocked<MatDialog>;

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
      deleteBanner: jest.fn<
        ReturnType<NotificationService['deleteBanner']>,
        Parameters<NotificationService['deleteBanner']>
      >(() => of(void 0)),
    };

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [BannerAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
      ],
    })
      .overrideComponent(BannerAdminListComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BannerAdminListComponent);
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

  it('ignores stale list timeout after a successful load', () => {
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
    expect(component.banners).toHaveLength(1);
  });

  it('returns early in list timeout callback when loading is already cleared', () => {
    serviceSpy.getAllBannersForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    component.isLoading = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
    expect(component.banners).toEqual([]);
  });

  it('handles list load errors', () => {
    serviceSpy.getAllBannersForAdmin.mockReturnValueOnce(
      throwError(() => new Error('load failed')),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load banners.');
  });

  it('builds an edit link for a banner', () => {
    expect(component.editLink(banner)).toBe('/admin/banners/b1/edit');
  });

  it('falls back to default severity styles for unknown severity', () => {
    const malformedBanner = {
      ...banner,
      severity: 'unknown' as unknown as NotificationSeverity,
    };

    expect(component.severityColourClass(malformedBanner)).toBe(
      'severity-info',
    );
    expect(component.severityIcon(malformedBanner)).toBe('fa-circle-info');
  });

  it('deletes a banner after confirmation', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);

    fixture.detectChanges();
    component.remove(banner);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(serviceSpy.deleteBanner).toHaveBeenCalledWith('b1');
    expect(component.banners).toEqual([]);
  });

  it('does not delete a banner when confirmation is declined', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);

    fixture.detectChanges();
    component.remove(banner);

    expect(serviceSpy.deleteBanner).not.toHaveBeenCalled();
  });

  it('handles delete errors after confirmation', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);
    serviceSpy.deleteBanner.mockReturnValueOnce(
      throwError(() => new Error('delete failed')),
    );

    fixture.detectChanges();
    component.remove(banner);

    expect(component.errorMessage).toBe('Failed to delete the banner.');
    expect(component.banners).toHaveLength(1);
  });
});
