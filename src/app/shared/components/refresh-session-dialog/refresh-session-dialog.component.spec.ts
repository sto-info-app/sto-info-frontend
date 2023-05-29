import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';
import { RefreshSessionDialogComponent } from './refresh-session-dialog.component';

//TODO: Add tests!

describe('RefreshSessionDialogComponent', () => {
  let component: RefreshSessionDialogComponent;
  let fixture: ComponentFixture<RefreshSessionDialogComponent>;

  const mockAppComponent = {
    //TODO: Mock properties and methods here
    // For example:
    // autoLogoutCountdown: 5,
    // startCountdown: () => {},
    // etc.
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RefreshSessionDialogComponent, TimeFormatPipe],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {
              return;
            },
          },
        },
        { provide: AppComponent, useValue: mockAppComponent },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { appComponent: mockAppComponent },
        },
      ],
    });
    fixture = TestBed.createComponent(RefreshSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
