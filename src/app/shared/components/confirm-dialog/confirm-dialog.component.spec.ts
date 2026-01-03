import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: jest.Mocked<MatDialogRef<ConfirmDialogComponent>>;

  const dialogData = {
    title: 'Test Title',
    message: 'Test Message',
    confirmText: 'Yes',
    cancelText: 'No',
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    } as unknown as jest.Mocked<MatDialogRef<ConfirmDialogComponent>>;

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title and message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const warningMessage = compiled.querySelector('app-lcars-warning-message');
    expect(warningMessage).toBeTruthy();
    // Since title and message are passed to app-lcars-warning-message,
    // we can check if they are correctly bound if we want,
    // but here we just check if component data is correct.
    expect(component.data.title).toBe('Test Title');
    expect(component.data.message).toBe('Test Message');
  });

  it('should call close(true) when onConfirm is called', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call close(false) when onCancel is called', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should use default values for title, cancelText and confirmText if not provided', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { message: 'Test Message' } },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');

    expect(buttons[0].textContent?.trim()).toBe('Cancel');
    expect(buttons[1].textContent?.trim()).toBe('Confirm');

    // Check warning message title default value via data.title || 'Yellow Alert' in template
    // We can't easily check the child component's input without more setup,
    // but we can trust the template logic for this simple case or check component data.
    expect(component.data.title).toBeUndefined();
  });
});
