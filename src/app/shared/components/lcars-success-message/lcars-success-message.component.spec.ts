import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getMessageElement, setComponentProperties } from '../test-utils';
import { LcarsSuccessMessageComponent } from './lcars-success-message.component';

describe('LcarsSuccessMessageComponent', () => {
  let component: LcarsSuccessMessageComponent;
  let fixture: ComponentFixture<LcarsSuccessMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsSuccessMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsSuccessMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title and message', () => {
    setComponentProperties(fixture, component, {
      title: 'Test Title',
      message: 'Test Message',
      blinkMessage: false,
    });

    const titleElement = fixture.debugElement.query(
      By.css('.lcars-text-bar span'),
    );
    const messageElement = getMessageElement(
      fixture,
      '.lcars-success-message',
    ).query(By.css('p'));
    expect(titleElement.nativeElement.textContent).toBe('Test Title');
    expect(messageElement.nativeElement.textContent).toBe('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties(fixture, component, { blinkMessage: true });
    fixture.detectChanges();

    const messageElement = getMessageElement(fixture, '.lcars-success-message');
    expect(messageElement.nativeElement.classList.contains('blink')).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties(fixture, component, { blinkMessage: false });
    fixture.detectChanges();

    const messageElement = getMessageElement(fixture, '.lcars-success-message');
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
