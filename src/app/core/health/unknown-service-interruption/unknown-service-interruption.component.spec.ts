import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownServiceInterruptionComponent } from './unknown-service-interruption.component';

describe('UnknownServiceInterruptionComponent', () => {
  let component: UnknownServiceInterruptionComponent;
  let fixture: ComponentFixture<UnknownServiceInterruptionComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnknownServiceInterruptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UnknownServiceInterruptionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
