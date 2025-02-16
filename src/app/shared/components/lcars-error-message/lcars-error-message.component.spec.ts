import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getMessageElement, setComponentProperties } from '../test-utils';
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
    setComponentProperties(fixture, component, {
      title: 'Test Title',
      message: 'Test Message',
    });

    const titleElement = fixture.debugElement.query(By.css('.go-mars'));
    expect(titleElement.nativeElement.textContent).toEqual('Test Title');

    const messageElement = getMessageElement(fixture, '.lcars-error-message p');
    expect(messageElement.nativeElement.textContent).toEqual('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties(fixture, component, { blinkMessage: true });

    const messageElement = getMessageElement(fixture, '.lcars-error-message');
    expect(messageElement.nativeElement.classList.contains('blink')).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties(fixture, component, { blinkMessage: false });

    const messageElement = getMessageElement(fixture, '.lcars-error-message');
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
