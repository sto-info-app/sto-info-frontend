import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefreshSessionDialogComponent } from './refresh-session-dialog.component';

describe('RefreshSessionDialogComponent', () => {
  let component: RefreshSessionDialogComponent;
  let fixture: ComponentFixture<RefreshSessionDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RefreshSessionDialogComponent],
    });
    fixture = TestBed.createComponent(RefreshSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
