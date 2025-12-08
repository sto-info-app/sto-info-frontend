import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppComponent } from 'src/app/app.component';
import { RefreshSessionDialogComponent } from './refresh-session-dialog.component';

//NOTE: Add tests! - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components

describe('RefreshSessionDialogComponent', () => {
  let component: RefreshSessionDialogComponent;
  let fixture: ComponentFixture<RefreshSessionDialogComponent>;

  const mockAppComponent = {
    //NOTE: Mock properties and methods here - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components
    // For example:
    // autoLogoutCountdown: 5,
    // startCountdown: () => {},
    // etc.
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RefreshSessionDialogComponent],
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
