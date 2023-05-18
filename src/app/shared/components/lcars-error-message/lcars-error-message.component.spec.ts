import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LcarsErrorMessageComponent } from './lcars-error-message.component';

describe('LcarsErrorMessageComponent', () => {
  let component: LcarsErrorMessageComponent;
  let fixture: ComponentFixture<LcarsErrorMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LcarsErrorMessageComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LcarsErrorMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct title and message', () => {
    component.title = 'Test Title';
    component.message = 'Test Message';
    fixture.detectChanges();

    const titleElement = fixture.debugElement.query(By.css('.go-mars'));
    expect(titleElement.nativeElement.textContent).toEqual('Test Title');

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-error-message p'),
    );
    expect(messageElement.nativeElement.textContent).toEqual('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    component.blinkMessage = true;
    fixture.detectChanges();

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-error-message'),
    );
    expect(messageElement.classes['blink']).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    component.blinkMessage = false;
    fixture.detectChanges();

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-error-message'),
    );
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
