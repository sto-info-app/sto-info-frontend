import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceInterruptionComponent } from './service-interruption.component';

describe('ServiceInterruptionComponent', () => {
  let component: ServiceInterruptionComponent;
  let fixture: ComponentFixture<ServiceInterruptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInterruptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInterruptionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
