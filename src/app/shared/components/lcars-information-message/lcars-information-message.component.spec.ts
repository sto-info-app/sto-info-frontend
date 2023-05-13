import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsInformationMessageComponent } from './lcars-information-message.component';

describe('LcarsInformationMessageComponent', () => {
  let component: LcarsInformationMessageComponent;
  let fixture: ComponentFixture<LcarsInformationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LcarsInformationMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LcarsInformationMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
