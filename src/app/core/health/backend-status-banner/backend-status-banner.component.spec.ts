import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackendStatusBannerComponent } from './backend-status-banner.component';

describe('BackendStatusBannerComponent', () => {
  let component: BackendStatusBannerComponent;
  let fixture: ComponentFixture<BackendStatusBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackendStatusBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackendStatusBannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
