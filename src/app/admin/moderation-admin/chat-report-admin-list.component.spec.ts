import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { ChatRemoveDialogComponent } from 'src/app/fleet/chat/chat-remove-dialog/chat-remove-dialog.component';
import {
  ChatReportDetail,
  ChatReportPage,
  ChatReportSummary,
} from 'src/app/models/fleet-chat.models';
import { ReportReason, ReportStatus } from 'src/app/models/moderation.models';

import {
  CHAT_REPORT_PAGE_SIZE,
  ChatReportAdminListComponent,
} from './chat-report-admin-list.component';
import { ChatReportAdminService } from './chat-report-admin.service';
import { ModerationHoldAdminService } from './moderation-hold-admin.service';
import { ChatReportDecisionDialogComponent } from './chat-report-decision-dialog.component';

const REPORT: ChatReportSummary = {
  id: 'report-1',
  messageId: 'message-1',
  place: {
    kind: 'CHANNEL',
    channelId: 'general',
    channelName: 'General',
    scopeKind: 'FLEET',
    scopeName: 'Fixture Fleet',
    conversationId: null,
  },
  reporter: { userId: 'odo', username: 'Odo' },
  author: { userId: 'kira', username: 'Kira' },
  reason: ReportReason.HARASSMENT,
  details: 'Again and again',
  status: ReportStatus.OPEN,
  createdAt: '2026-09-28T12:00:00.000Z',
  openUserReportCount: 0,
};

const DETAIL: ChatReportDetail = {
  ...REPORT,
  evidence: [
    {
      position: 1,
      messageId: 'message-0',
      author: null,
      body: null,
      deleted: true,
      sentAt: '2026-09-28T11:59:00.000Z',
    },
    {
      position: 0,
      messageId: 'message-1',
      author: { userId: 'kira', username: 'Kira' },
      body: 'The reported words',
      deleted: false,
      sentAt: '2026-09-28T12:00:00.000Z',
    },
  ],
  messageRemoved: false,
  resolutionNote: null,
  resolvedBy: null,
  resolvedAt: null,
  holdId: null,
};

/**
 * A page of the queue.
 *
 * @param items - Its reports.
 * @param total - How many match.
 * @returns The page.
 */
const pageOf = (
  items: ChatReportSummary[],
  total = items.length,
): ChatReportPage => ({
  items,
  total,
  page: 1,
  pageSize: CHAT_REPORT_PAGE_SIZE,
  openCount: items.filter(each => each.status === ReportStatus.OPEN).length,
});

describe('ChatReportAdminListComponent', () => {
  let fixture: ComponentFixture<ChatReportAdminListComponent>;
  let element: HTMLElement;
  let reports: {
    list: jest.Mock;
    detail: jest.Mock;
    decide: jest.Mock;
    removeMessage: jest.Mock;
  };
  let dialogResult: unknown;
  let dialog: { open: jest.Mock };
  let holds: { place: jest.Mock };

  beforeEach(() => {
    reports = {
      list: jest.fn(() => of(pageOf([REPORT]))),
      detail: jest.fn(() => of(DETAIL)),
      decide: jest.fn(() =>
        of({
          ...DETAIL,
          status: ReportStatus.ACTIONED,
          resolvedAt: '2026-09-28T13:00:00.000Z',
          resolvedBy: { userId: 'admin', username: 'Admin' },
          resolutionNote: 'Warned them',
        }),
      ),
      removeMessage: jest.fn(() => of({ ...DETAIL, messageRemoved: true })),
    };
    dialogResult = undefined;
    holds = { place: jest.fn(() => of({})) };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })),
    };
    TestBed.configureTestingModule({
      imports: [ChatReportAdminListComponent],
      providers: [
        provideRouter([]),
        { provide: ChatReportAdminService, useValue: reports },
        { provide: MatDialog, useValue: dialog },
        { provide: ModerationHoldAdminService, useValue: holds },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  /** Shows the page. */
  const show = async (): Promise<void> => {
    fixture = TestBed.createComponent(ChatReportAdminListComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  };

  const button = (label: string): HTMLButtonElement =>
    [...element.querySelectorAll('button')].find(
      each =>
        each.textContent?.trim() === label ||
        each.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;
  const text = (): string => element.textContent?.replace(/\s+/g, ' ') ?? '';

  it('lists open reports first, with where, who and why', async () => {
    await show();

    expect(reports.list).toHaveBeenCalledWith({
      status: ReportStatus.OPEN,
      page: 1,
      pageSize: CHAT_REPORT_PAGE_SIZE,
    });
    expect(text()).toContain('Fleet Fixture Fleet · # General');
    expect(text()).toContain('Kira');
    expect(text()).toContain('Odo');
    expect(text()).toContain('Harassment or threats');
    expect(text()).toContain('Again and again');
    expect(element.querySelector('.header-count-badge')?.textContent).toBe('1');
  });

  it('names a direct message, a gone channel, and people without accounts', async () => {
    reports.list.mockReturnValue(
      of(
        pageOf([
          {
            ...REPORT,
            id: 'direct',
            place: {
              ...REPORT.place,
              kind: 'DIRECT',
              channelId: null,
              conversationId: 'talk',
            },
            details: null,
            reporter: null,
          },
          {
            ...REPORT,
            id: 'gone',
            place: {
              ...REPORT.place,
              channelName: null,
              scopeKind: null,
              scopeName: null,
            },
            status: ReportStatus.DISMISSED,
          },
        ]),
      ),
    );
    await show();

    expect(text()).toContain('Direct message');
    expect(text()).toContain('# a removed channel');
    expect(text()).toContain('The reporter left no further detail.');
    expect(
      [...element.querySelectorAll('button')].filter(
        each => each.getAttribute('aria-label') === 'Resolve',
      ),
    ).toHaveLength(1);
  });

  it('filters by status from the first page, or shows everything', async () => {
    await show();

    const select = element.querySelector(
      '#chat-report-status-filter',
    ) as HTMLSelectElement;

    select.value = ReportStatus.DISMISSED;
    select.dispatchEvent(new Event('change'));
    expect(reports.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ReportStatus.DISMISSED, page: 1 }),
    );

    select.value = 'ALL';
    select.dispatchEvent(new Event('change'));
    expect(reports.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined }),
    );
    expect(select.options[3].textContent?.trim()).toBe('All reports');
  });

  it('pages through a long queue', async () => {
    reports.list.mockReturnValue(of(pageOf([REPORT], 45)));
    await show();

    expect(text()).toContain('Page 1 of 3');
    expect(button('Earlier').disabled).toBe(true);

    button('Later').click();
    await fixture.whenStable();
    expect(reports.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );

    button('Earlier').click();
    expect(reports.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });

  it('says when the queue is empty, or cannot be read', async () => {
    reports.list.mockReturnValue(of(pageOf([])));
    await show();
    expect(text()).toContain('No chat reports match this filter.');
    expect(element.querySelector('.header-count-badge')).toBeNull();
    expect(text()).not.toContain('Page 1');

    reports.list.mockReturnValue(throwError(() => new Error('offline')));
    fixture.componentInstance['setFilter'](ReportStatus.OPEN);
    await fixture.whenStable();
    expect(text()).toContain('Chat reports could not be read.');
  });

  it('shows and hides the evidence, oldest first, reading it once', async () => {
    await show();

    button('Show evidence').click();
    await fixture.whenStable();

    const held = [
      ...element.querySelectorAll('.chat-report-evidence__message'),
    ].map(each => each.textContent?.replace(/\s+/g, ' ').trim());

    expect(held[0]).toContain('Deleted before the report');
    expect(held[1]).toContain('Reported');
    expect(held[1]).toContain('The reported words');
    expect(text()).not.toContain('has since been deleted');

    button('Hide evidence').click();
    await fixture.whenStable();
    expect(element.querySelector('.chat-report-evidence')).toBeNull();
    expect(reports.detail).toHaveBeenCalledTimes(1);
  });

  it('says when the evidence cannot be read', async () => {
    reports.detail.mockReturnValue(throwError(() => new Error('offline')));
    await show();

    button('Show evidence').click();
    await fixture.whenStable();

    expect(text()).toContain('That report could not be read.');
  });

  it.each([
    ['Resolve', ReportStatus.ACTIONED, 'The report was resolved.'],
    ['Dismiss', ReportStatus.DISMISSED, 'The report was dismissed.'],
  ])('%s a report with a note', async (label, status, message) => {
    await show();

    button(label).click();
    expect(reports.decide).not.toHaveBeenCalled();

    dialogResult = { status, note: 'Warned them' };
    button(label).click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenLastCalledWith(
      ChatReportDecisionDialogComponent,
      { data: { status, authorName: 'Kira' } },
    );
    expect(reports.decide).toHaveBeenCalledWith('report-1', {
      status,
      note: 'Warned them',
    });
    expect(text()).toContain(message);
    expect(text()).toContain('by Admin');
    expect(text()).toContain('— Warned them');
    expect(reports.list).toHaveBeenCalledTimes(2);
  });

  it('removes the reported message with a reason, keeping its evidence', async () => {
    await show();

    button('Remove the message').click();
    expect(reports.removeMessage).not.toHaveBeenCalled();

    dialogResult = 'Harassment';
    button('Remove the message').click();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenLastCalledWith(ChatRemoveDialogComponent, {
      data: { authorName: 'Kira' },
    });
    expect(reports.removeMessage).toHaveBeenCalledWith(
      'report-1',
      'Harassment',
    );
    expect(text()).toContain('The message was removed.');
    expect(text()).toContain('has since been deleted or removed');
  });

  it('says why an action was refused', async () => {
    reports.removeMessage.mockReturnValue(
      throwError(() => ({
        error: { message: 'That message is already gone.' },
      })),
    );
    reports.decide.mockReturnValue(throwError(() => ({})));
    await show();

    dialogResult = 'Spam';
    button('Remove the message').click();
    await fixture.whenStable();
    expect(text()).toContain('That message is already gone.');

    dialogResult = { status: ReportStatus.DISMISSED };
    button('Dismiss').click();
    await fixture.whenStable();
    expect(text()).toContain('That report could not be closed.');
  });

  describe('linked queues and holds (FC-036)', () => {
    it('links to the open member reports about the author', async () => {
      reports.list.mockReturnValue(
        of(
          pageOf([
            { ...REPORT, openUserReportCount: 3 },
            { ...REPORT, id: 'report-2', openUserReportCount: 1 },
          ]),
        ),
      );
      await show();

      expect(text()).toContain('3 open member reports about Kira');
      expect(text()).toContain('1 open member report about Kira');
    });

    it('holds a report’s evidence with a reason, then shows it held', async () => {
      await show();
      button('Show evidence').click();
      await fixture.whenStable();

      button('Hold this evidence…').click();
      expect(holds.place).not.toHaveBeenCalled();

      reports.detail.mockReturnValue(of({ ...DETAIL, holdId: 'hold-1' }));
      dialogResult = 'Keep it';
      button('Hold this evidence…').click();
      await fixture.whenStable();

      expect(holds.place).toHaveBeenCalledWith({
        kind: 'CHAT_REPORT',
        chatReportId: 'report-1',
        reason: 'Keep it',
      });
      expect(text()).toContain('Its evidence is held.');
      expect(text()).toContain('Held past its 90 days');
    });

    it('holds the author’s messages without reading the evidence again', async () => {
      await show();

      dialogResult = 'Harassment case';
      button('Hold Kira’s messages').click();
      await fixture.whenStable();

      expect(holds.place).toHaveBeenCalledWith({
        kind: 'MEMBER_MESSAGES',
        subjectUserId: 'kira',
        reason: 'Harassment case',
      });
      expect(text()).toContain('Their messages are held.');
      expect(reports.detail).not.toHaveBeenCalled();
    });

    it('offers no author hold for an account that has gone', async () => {
      reports.list.mockReturnValue(of(pageOf([{ ...REPORT, author: null }])));
      await show();

      expect(
        [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
          .map(each => each.getAttribute('aria-label') ?? '')
          .filter(label => label.startsWith('Hold ')),
      ).toEqual([]);
    });

    it('says why it could not be held, and survives a failed refresh', async () => {
      await show();
      button('Show evidence').click();
      await fixture.whenStable();

      holds.place.mockReturnValue(
        throwError(() => ({ error: { message: 'Already held.' } })),
      );
      dialogResult = 'Keep it';
      button('Hold this evidence…').click();
      await fixture.whenStable();
      expect(text()).toContain('Already held.');

      holds.place.mockReturnValue(throwError(() => ({})));
      button('Hold this evidence…').click();
      await fixture.whenStable();
      expect(text()).toContain('That could not be held.');

      holds.place.mockReturnValue(of({}));
      reports.detail.mockReturnValue(throwError(() => new Error('down')));
      button('Hold this evidence…').click();
      await fixture.whenStable();
      expect(text()).toContain('Its evidence is held.');
    });
  });
});
