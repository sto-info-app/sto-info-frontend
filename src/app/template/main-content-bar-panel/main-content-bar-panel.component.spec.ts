import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainContentBarPanelComponent } from './main-content-bar-panel.component';

describe('MainContentBarPanelComponent', () => {
  let component: MainContentBarPanelComponent;
  let fixture: ComponentFixture<MainContentBarPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MainContentBarPanelComponent]
    });
    fixture = TestBed.createComponent(MainContentBarPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
