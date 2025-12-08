import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingBarComponent } from './loading-bar.component';

describe('LoadingBarComponent', () => {
  let component: LoadingBarComponent;
  let fixture: ComponentFixture<LoadingBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use default loading text', () => {
    fixture.detectChanges();
    expect(component.loadingText).toBe('Loading');
  });

  it('should bind custom loading text', () => {
    component.loadingText = 'Please wait';
    fixture.detectChanges();
    expect(component.loadingText).toBe('Please wait');
  });
});
