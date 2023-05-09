import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsErrorMessageComponent } from './lcars-error-message.component';

describe('LcarsErrorMessageComponent', () => {
  let component: LcarsErrorMessageComponent;
  let fixture: ComponentFixture<LcarsErrorMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LcarsErrorMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LcarsErrorMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
