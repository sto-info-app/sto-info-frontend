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
  ModeratedUser,
  PaginatedReports,
  ReportReason,
  ReportStatus,
  UserReport,
} from 'src/app/models/moderation.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { ReportAdminListComponent } from './report-admin-list.component';

const REPORTED_ID = 'reported-1';

/**
 * Builds a report fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A report-shaped test fixture.
 */
function buildReport(overrides: Partial<UserReport> = {}): UserReport {
  return {
    id: 'report-1',
    reporter: {
      userId: 'reporter-1',
      username: 'reporter',
      profilePicture100: null,
      isAccountDisabled: false,
    },
    reported: {
      userId: REPORTED_ID,
      username: 'reported',
      profilePicture100: null,
      isAccountDisabled: false,
    },
    reason: ReportReason.HARASSMENT,
    details: 'Repeated abusive messages.',
    status: ReportStatus.OPEN,
    moderatorNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a page of reports.
 *
 * @param items - The reports on the page.
 * @param openCount - The queue-wide unresolved count.
 * @returns A paginated-reports fixture.
 */
function buildPage(
  items: UserReport[],
  openCount = items.length,
): PaginatedReports {
  return { items, total: items.length, page: 1, pageSize: 20, openCount };
}

describe('ReportAdminListComponent', () => {
  let component: ReportAdminListComponent;
  let fixture: ComponentFixture<ReportAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      ModerationService,
      'getReports' | 'updateReport' | 'disableUser' | 'enableUser'
    >
  >;
  let dialogSpy: jest.Mocked<MatDialog>;

  /**
   * Stubs the confirm dialog to close with the given result.
   *
   * @param confirmed - Whether the administrator confirmed.
   */
  const stubDialog = (confirmed: boolean): void => {
    dialogSpy.open.mockReturnValue({
      afterClosed: jest.fn().mockReturnValue(of(confirmed)),
    } as unknown as MatDialogRef<unknown>);
  };

  beforeEach(async () => {
    serviceSpy = {
      getReports: jest.fn(() => of(buildPage([]))),
      updateReport: jest
        .fn<
          ReturnType<ModerationService['updateReport']>,
          Parameters<ModerationService['updateReport']>
        >()
        .mockReturnValue(of(buildReport())),
      disableUser: jest
        .fn<
          ReturnType<ModerationService['disableUser']>,
          Parameters<ModerationService['disableUser']>
        >()
        .mockReturnValue(of({ id: REPORTED_ID } as ModeratedUser)),
      enableUser: jest
        .fn<
          ReturnType<ModerationService['enableUser']>,
          Parameters<ModerationService['enableUser']>
        >()
        .mockReturnValue(of({ id: REPORTED_ID } as ModeratedUser)),
    };

    dialogSpy = { open: jest.fn() } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [ReportAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: ModerationService, useValue: serviceSpy },
      ],
    })
      .overrideComponent(ReportAdminListComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReportAdminListComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the open reports on init', () => {
    fixture.detectChanges();

    expect(serviceSpy.getReports).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReportStatus.OPEN }),
    );
    expect(component.isLoading).toBe(false);
  });

  it('carries the queue-wide unresolved count', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      of(buildPage([buildReport()], 9)),
    );

    fixture.detectChanges();

    expect(component.openCount).toBe(9);
  });

  it('drops the status filter when showing everything', () => {
    fixture.detectChanges();
    component.statusFilter = 'ALL';

    component.applyFilters();

    expect(serviceSpy.getReports).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it('sends a trimmed search term, or none at all', () => {
    fixture.detectChanges();
    component.search = '  picard  ';
    component.applyFilters();

    expect(serviceSpy.getReports).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'picard' }),
    );

    component.search = '   ';
    component.applyFilters();

    expect(serviceSpy.getReports).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined }),
    );
  });

  it('labels the "all" filter apart from the states', () => {
    expect(component.filterLabel('ALL')).toBe('All reports');
    expect(component.filterLabel(ReportStatus.UNDER_REVIEW)).toBe(
      'Under review',
    );
  });

  it('sets an error when loading fails', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load reports.');
  });

  it('handles a malformed page without hanging loading', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      of(null as unknown as PaginatedReports),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.reports).toEqual([]);
    expect(component.openCount).toBe(0);
  });

  it('clears loading when the request hangs', () => {
    serviceSpy.getReports.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading reports is taking longer than expected. Please try again.',
    );
  });

  it('skips the timeout fallback once loading has already finished', () => {
    serviceSpy.getReports.mockReturnValueOnce(NEVER);
    fixture.detectChanges();
    component.isLoading = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('claims a report without asking for confirmation', () => {
    fixture.detectChanges();

    component.claim(buildReport());

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(serviceSpy.updateReport).toHaveBeenCalledWith('report-1', {
      status: ReportStatus.UNDER_REVIEW,
    });
    expect(component.successMessage).toContain('under review');
  });

  it('closes a report as actioned', () => {
    fixture.detectChanges();

    component.markActioned(buildReport());

    expect(serviceSpy.updateReport).toHaveBeenCalledWith('report-1', {
      status: ReportStatus.ACTIONED,
    });
  });

  it('dismisses a report after confirmation', () => {
    fixture.detectChanges();
    stubDialog(true);

    component.dismiss(buildReport());

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(serviceSpy.updateReport).toHaveBeenCalledWith('report-1', {
      status: ReportStatus.DISMISSED,
    });
  });

  it('does not dismiss when the administrator cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.dismiss(buildReport());

    expect(serviceSpy.updateReport).not.toHaveBeenCalled();
  });

  it('sets an error when a status change fails', () => {
    fixture.detectChanges();
    serviceSpy.updateReport.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.markActioned(buildReport());

    expect(component.errorMessage).toBe('Failed to update that report.');
  });

  it('disables the reported member after confirmation and reloads', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.getReports.mockClear();

    component.disableReported(buildReport());

    expect(serviceSpy.disableUser).toHaveBeenCalledWith(REPORTED_ID);
    expect(serviceSpy.getReports).toHaveBeenCalled();
    expect(component.successMessage).toContain('disabled');
  });

  it('does not disable when the administrator cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.disableReported(buildReport());

    expect(serviceSpy.disableUser).not.toHaveBeenCalled();
  });

  it('sets an error when disabling fails', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.disableUser.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.disableReported(buildReport());

    expect(component.errorMessage).toBe('Failed to disable that account.');
  });

  it('restores the reported member after confirmation', () => {
    fixture.detectChanges();
    stubDialog(true);

    component.enableReported(
      buildReport({
        reported: {
          userId: REPORTED_ID,
          username: 'reported',
          profilePicture100: null,
          isAccountDisabled: true,
        },
      }),
    );

    expect(serviceSpy.enableUser).toHaveBeenCalledWith(REPORTED_ID);
    expect(component.successMessage).toContain('restored');
  });

  it('does not restore when the administrator cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.enableReported(buildReport());

    expect(serviceSpy.enableUser).not.toHaveBeenCalled();
  });

  it('sets an error when restoring fails', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.enableUser.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.enableReported(buildReport());

    expect(component.errorMessage).toBe('Failed to restore that account.');
  });

  it('falls back to the user ID when a member never set a username', () => {
    const report = buildReport({
      reporter: {
        userId: 'reporter-1',
        username: null,
        profilePicture100: null,
        isAccountDisabled: false,
      },
      reported: {
        userId: REPORTED_ID,
        username: null,
        profilePicture100: null,
        isAccountDisabled: false,
      },
    });

    expect(component.reportedName(report)).toBe(REPORTED_ID);
    expect(component.reporterName(report)).toBe('reporter-1');
  });

  it('names both members from their usernames when they have them', () => {
    const report = buildReport();

    expect(component.reportedName(report)).toBe('reported');
    expect(component.reporterName(report)).toBe('reporter');
  });

  it('renders a report with its reason and status', () => {
    serviceSpy.getReports.mockReturnValueOnce(of(buildPage([buildReport()])));

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('reported');
    expect(text).toContain('Harassment or threats');
    expect(text).toContain('Open');
  });

  it('notes when the reporter left no detail', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      of(buildPage([buildReport({ details: null })])),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'The reporter left no further detail.',
    );
  });

  it('shows the reviewer and notes once a report has been looked at', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      of(
        buildPage([
          buildReport({
            status: ReportStatus.DISMISSED,
            reviewedBy: 'admin',
            reviewedAt: '2026-08-02T00:00:00.000Z',
            moderatorNotes: 'No evidence found.',
          }),
        ]),
      ),
    );

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('admin');
    expect(text).toContain('No evidence found.');
  });

  it('marks a report whose subject is already disabled', () => {
    serviceSpy.getReports.mockReturnValueOnce(
      of(
        buildPage([
          buildReport({
            reported: {
              userId: REPORTED_ID,
              username: 'reported',
              profilePicture100: null,
              isAccountDisabled: true,
            },
          }),
        ]),
      ),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Disabled');
  });

  it('reports an empty queue', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No reports match this filter.',
    );
  });
});
