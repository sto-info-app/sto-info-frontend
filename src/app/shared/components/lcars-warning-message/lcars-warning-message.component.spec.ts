import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getMessageElement, setComponentProperties } from '../test-utils';
import { LcarsWarningMessageComponent } from './lcars-warning-message.component';

describe('LcarsWarningMessageComponent', () => {
  let component: LcarsWarningMessageComponent;
  let fixture: ComponentFixture<LcarsWarningMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LcarsWarningMessageComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LcarsWarningMessageComponent);
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

    const titleElement = fixture.debugElement.query(
      By.css('.go-october-sunset'),
    );
    expect(titleElement.nativeElement.textContent).toEqual('Test Title');

    const messageElement = getMessageElement(
      fixture,
      '.lcars-warning-message p',
    );
    expect(messageElement.nativeElement.textContent).toEqual('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties(fixture, component, { blinkMessage: true });

    const messageElement = getMessageElement(fixture, '.lcars-warning-message');
    expect(messageElement.nativeElement.classList.contains('blink')).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties(fixture, component, { blinkMessage: false });

    const messageElement = getMessageElement(fixture, '.lcars-warning-message');
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
