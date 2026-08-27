import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  AppealStatus,
  ModerationAppeal,
  StorytimeReport,
  StorytimeReportReason,
  StorytimeReportStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { ModerationQueueComponent } from './moderation-queue.component';

describe('ModerationQueueComponent', () => {
  let fixture: ComponentFixture<ModerationQueueComponent>;
  let moderationService: {
    getReports: jest.Mock;
    getAppeals: jest.Mock;
    resolveReport: jest.Mock;
    removeContent: jest.Mock;
    decideAppeal: jest.Mock;
  };

  /**
   * Builds a report.
   *
   * @param overrides - Fields to change.
   * @returns The report.
   */
  const buildReport = (
    overrides: Partial<StorytimeReport> = {},
  ): StorytimeReport =>
    ({
      id: 'report-1',
      reporterUserId: 'reader-1',
      targetType: StorytimeTargetType.STORY,
      targetId: 'story-1',
      reasonCode: StorytimeReportReason.HARASSMENT,
      description: 'Chapter three names a real person.',
      status: StorytimeReportStatus.OPEN,
      assignedToUserId: null,
      resolution: null,
      resolvedAt: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      ...overrides,
    }) as StorytimeReport;

  /**
   * Builds an appeal.
   *
   * @param overrides - Fields to change.
   * @returns The appeal.
   */
  const buildAppeal = (
    overrides: Partial<ModerationAppeal> = {},
  ): ModerationAppeal =>
    ({
      id: 'appeal-1',
      targetType: StorytimeTargetType.STORY,
      targetId: 'story-1',
      appellantUserId: 'writer-1',
      body: 'The passage quoted is my own writing.',
      status: AppealStatus.SUBMITTED,
      reviewNotes: null,
      reviewedAt: null,
      createdAt: '2026-06-03T00:00:00.000Z',
      ...overrides,
    }) as ModerationAppeal;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ModerationQueueComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    moderationService = {
      getReports: jest.fn().mockReturnValue(of([buildReport()])),
      getAppeals: jest.fn().mockReturnValue(of([buildAppeal()])),
      resolveReport: jest.fn().mockReturnValue(of(buildReport())),
      removeContent: jest.fn().mockReturnValue(of({ id: 'action-1' })),
      decideAppeal: jest.fn().mockReturnValue(of(buildAppeal())),
    };

    TestBed.configureTestingModule({
      imports: [ModerationQueueComponent],
      providers: [
        provideRouter([]),
        { provide: StorytimeModerationService, useValue: moderationService },
      ],
    });
  });

  it('shows what has been reported', () => {
    const element = render();

    expect(element.textContent).toContain('Harassment');
    expect(element.textContent).toContain('names a real person');
  });

  it('shows who is waiting on an appeal', () => {
    const element = render();

    expect(element.textContent).toContain('my own writing');
    expect(moderationService.getAppeals).toHaveBeenCalledWith(
      AppealStatus.SUBMITTED,
    );
  });

  it('says so when both queues are empty', () => {
    moderationService.getReports.mockReturnValue(of([]));
    moderationService.getAppeals.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('Nothing has been reported');
    expect(element.textContent).toContain('Nobody is waiting on an appeal');
  });

  it('claims a report', () => {
    render();
    fixture.componentInstance.claim(buildReport());

    expect(moderationService.resolveReport).toHaveBeenCalledWith('report-1', {
      status: StorytimeReportStatus.UNDER_REVIEW,
    });
  });

  // A removal nobody can explain is a removal nobody can appeal.
  it('refuses to remove anything without a message for the creator', () => {
    render();
    fixture.componentInstance.removeContent(buildReport());

    expect(moderationService.removeContent).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage).toContain('word for word');
  });

  it('removes the content and closes the report', () => {
    render();
    fixture.componentInstance.form.patchValue({
      message: 'This breaches the harassment policy.',
    });
    fixture.componentInstance.removeContent(buildReport());

    expect(moderationService.removeContent).toHaveBeenCalledWith({
      targetType: StorytimeTargetType.STORY,
      targetId: 'story-1',
      reasonCode: StorytimeReportReason.HARASSMENT,
      message: 'This breaches the harassment policy.',
    });
    expect(moderationService.resolveReport).toHaveBeenCalledWith('report-1', {
      status: StorytimeReportStatus.ACTIONED,
      resolution: 'This breaches the harassment policy.',
    });
  });

  it('dismisses a report with a note for the record', () => {
    render();
    fixture.componentInstance.form.patchValue({
      resolution: 'Within the rating.',
    });
    fixture.componentInstance.dismiss(buildReport());

    expect(moderationService.resolveReport).toHaveBeenCalledWith('report-1', {
      status: StorytimeReportStatus.DISMISSED,
      resolution: 'Within the rating.',
    });
  });

  it('dismisses a report without one', () => {
    render();
    fixture.componentInstance.dismiss(buildReport());

    expect(moderationService.resolveReport).toHaveBeenCalledWith('report-1', {
      status: StorytimeReportStatus.DISMISSED,
      resolution: undefined,
    });
  });

  it.each([
    ['uphold', true],
    ['reject', false],
  ])('%ss an appeal', (method, uphold) => {
    render();
    fixture.componentInstance[method as 'uphold' | 'reject'](buildAppeal());

    expect(moderationService.decideAppeal).toHaveBeenCalledWith('appeal-1', {
      uphold,
      reviewNotes: undefined,
    });
  });

  it('passes the administrator’s words on with a decision', () => {
    render();
    fixture.componentInstance.form.patchValue({ message: 'You are right.' });
    fixture.componentInstance.uphold(buildAppeal());

    expect(moderationService.decideAppeal).toHaveBeenCalledWith('appeal-1', {
      uphold: true,
      reviewNotes: 'You are right.',
    });
  });

  // A report already being worked on should not offer to be claimed again.
  it.each([
    [StorytimeReportStatus.OPEN, true],
    [StorytimeReportStatus.UNDER_REVIEW, true],
    [StorytimeReportStatus.ACTIONED, false],
    [StorytimeReportStatus.DISMISSED, false],
  ])('knows a %s report is live: %s', (status, expected) => {
    render();

    expect(fixture.componentInstance.isLive(buildReport({ status }))).toBe(
      expected,
    );
  });

  it('shows the reason the server gave for a refused action', () => {
    moderationService.decideAppeal.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'That appeal has already been answered.' },
          }),
      ),
    );

    render();
    fixture.componentInstance.uphold(buildAppeal());

    expect(fixture.componentInstance.errorMessage).toContain(
      'already been answered',
    );
  });

  it('falls back to a generic message when the server gives none', () => {
    moderationService.decideAppeal.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.uphold(buildAppeal());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
  });

  it('reports a failure to load', () => {
    moderationService.getReports.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });

  it('reloads once an action has been saved', () => {
    render();
    fixture.componentInstance.claim(buildReport());

    expect(moderationService.getReports).toHaveBeenCalledTimes(2);
  });
});
