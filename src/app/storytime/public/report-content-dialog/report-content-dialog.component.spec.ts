import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import {
  StorytimeReportReason,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReportContentDialogComponent } from './report-content-dialog.component';

describe('ReportContentDialogComponent', () => {
  let fixture: ComponentFixture<ReportContentDialogComponent>;
  let dialogRef: { close: jest.Mock };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ReportContentDialogComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            targetType: StorytimeTargetType.STORY,
            targetId: 'story-1',
            label: 'Story',
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ReportContentDialogComponent);
    fixture.detectChanges();
  });

  it('names what is being reported', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Report this Story',
    );
  });

  // A reporter picks from the policy's own categories, so the two surfaces
  // cannot describe the rules differently.
  it('offers the content policy categories', () => {
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '#report-reason option',
    );

    expect(options.length).toBeGreaterThan(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Plagiarism',
    );
  });

  // Nothing is removed automatically, and saying so up front stops a reporter
  // expecting it.
  it('says what a report does', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Nothing is removed automatically');
    expect(text).toContain('never told who reported them');
  });

  it('closes with the reason and the explanation', () => {
    fixture.componentInstance.form.patchValue({
      reasonCode: StorytimeReportReason.PLAGIARISM,
      description: '  Copied from elsewhere.  ',
    });
    fixture.componentInstance.submit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reasonCode: StorytimeReportReason.PLAGIARISM,
      description: 'Copied from elsewhere.',
    });
  });

  // Somebody who has just read something upsetting should not have to write an
  // essay to say so.
  it('sends no explanation when none was written', () => {
    fixture.componentInstance.submit();

    expect(dialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ description: undefined }),
    );
  });

  it('refuses to send without a reason', () => {
    fixture.componentInstance.form.patchValue({ reasonCode: '' });
    fixture.componentInstance.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with nothing when cancelled', () => {
    fixture.componentInstance.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
