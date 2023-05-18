import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LcarsSuccessMessageComponent } from './lcars-success-message.component';

describe('LcarsSuccessMessageComponent', () => {
  let component: LcarsSuccessMessageComponent;
  let fixture: ComponentFixture<LcarsSuccessMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LcarsSuccessMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsSuccessMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title and message', () => {
    component.title = 'Test Title';
    component.message = 'Test Message';
    fixture.detectChanges();

    const titleElement = fixture.debugElement.query(
      By.css('.lcars-text-bar span'),
    );
    const messageElement = fixture.debugElement.query(
      By.css('.lcars-success-message p'),
    );
    expect(titleElement.nativeElement.textContent).toBe('Test Title');
    expect(messageElement.nativeElement.textContent).toBe('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    component.blinkMessage = true;
    fixture.detectChanges();

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-success-message'),
    );
    expect(messageElement.nativeElement.classList.contains('blink')).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    component.blinkMessage = false;
    fixture.detectChanges();

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-success-message'),
    );
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
