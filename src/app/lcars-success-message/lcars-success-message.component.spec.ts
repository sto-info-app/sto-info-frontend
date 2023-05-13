import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsSuccessMessageComponent } from './lcars-success-message.component';

describe('LcarsSuccessMessageComponent', () => {
  let component: LcarsSuccessMessageComponent;
  let fixture: ComponentFixture<LcarsSuccessMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LcarsSuccessMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LcarsSuccessMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
