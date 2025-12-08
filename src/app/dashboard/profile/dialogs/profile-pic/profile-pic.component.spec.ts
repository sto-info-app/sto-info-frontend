import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ProfilePicComponent } from './profile-pic.component';

describe('ProfilePicComponent', () => {
  let component: ProfilePicComponent;
  let fixture: ComponentFixture<ProfilePicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePicComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
