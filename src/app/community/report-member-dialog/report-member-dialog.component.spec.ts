import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReportReason } from 'src/app/models/moderation.models';
import { ReportMemberDialogComponent } from './report-member-dialog.component';

describe('ReportMemberDialogComponent', () => {
  let component: ReportMemberDialogComponent;
  let fixture: ComponentFixture<ReportMemberDialogComponent>;
  let dialogRef: { close: jest.Mock };

  beforeEach(async () => {
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ReportMemberDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { username: 'captain.picard' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportMemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('names the member being reported', () => {
    expect(fixture.nativeElement.textContent).toContain('captain.picard');
  });

  it('offers every reason', () => {
    expect(component.reasons).toHaveLength(Object.values(ReportReason).length);
  });

  it('closes with the chosen reason and trimmed details', () => {
    component.form.setValue({
      reason: ReportReason.SPAM,
      details: '  Advertising a gold-selling site.  ',
    });

    component.onSubmit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reason: ReportReason.SPAM,
      details: 'Advertising a gold-selling site.',
    });
  });

  it('omits empty details rather than sending a blank string', () => {
    component.form.setValue({ reason: ReportReason.SPAM, details: '   ' });

    component.onSubmit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reason: ReportReason.SPAM,
      details: undefined,
    });
  });

  it('requires details when the reason explains nothing on its own', () => {
    component.form.setValue({ reason: ReportReason.OTHER, details: '' });

    component.onSubmit();

    expect(component.requiresDetails).toBe(true);
    expect(component.form.controls.details.hasError('required')).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('accepts "Something else" once details are given', () => {
    component.form.setValue({
      reason: ReportReason.OTHER,
      details: 'Posting other members addresses.',
    });

    component.onSubmit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reason: ReportReason.OTHER,
      details: 'Posting other members addresses.',
    });
  });

  it('refuses details longer than the API accepts', () => {
    component.form.setValue({
      reason: ReportReason.SPAM,
      details: 'x'.repeat(1001),
    });

    component.onSubmit();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('treats a null details value as empty', () => {
    component.form.controls.details.setValue(null);

    component.onSubmit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reason: ReportReason.HARASSMENT,
      details: undefined,
    });
  });

  it('closes with nothing when cancelled', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
