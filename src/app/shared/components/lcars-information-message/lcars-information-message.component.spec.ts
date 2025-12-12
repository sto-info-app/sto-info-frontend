import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getMessageElement, setComponentProperties } from '../test-utils';
import { LcarsInformationMessageComponent } from './lcars-information-message.component';

describe('LcarsInformationMessageComponent', () => {
  let component: LcarsInformationMessageComponent;
  let fixture: ComponentFixture<LcarsInformationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsInformationMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsInformationMessageComponent);
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
      '.lcars-info-message',
    ).query(By.css('p'));
    expect(titleElement.nativeElement.textContent).toBe('Test Title');
    expect(messageElement.nativeElement.textContent).toBe('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties(fixture, component, { blinkMessage: true });

    const messageElement = getMessageElement(fixture, '.lcars-info-message');
    expect(messageElement.nativeElement.classList.contains('blink')).toBe(true);
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties(fixture, component, { blinkMessage: false });

    const messageElement = getMessageElement(fixture, '.lcars-info-message');
    expect(messageElement.nativeElement.classList.contains('blink')).toBe(
      false,
    );
  });

  it('should update title when title input changes', () => {
    setComponentProperties(fixture, component, {
      title: 'New Title',
      message: 'Test Message',
      blinkMessage: false,
    });

    const titleElement = fixture.debugElement.query(
      By.css('.lcars-text-bar span'),
    );
    expect(titleElement.nativeElement.textContent).toBe('New Title');
  });

  it('should update message when message input changes', () => {
    setComponentProperties(fixture, component, {
      title: 'Test Title',
      message: 'New Message',
      blinkMessage: false,
    });

    const messageElement = getMessageElement(
      fixture,
      '.lcars-info-message',
    ).query(By.css('p'));
    expect(messageElement.nativeElement.textContent).toBe('New Message');
  });

  it('should handle empty title and message', () => {
    setComponentProperties(fixture, component, {
      title: '',
      message: '',
      blinkMessage: false,
    });

    const titleElement = fixture.debugElement.query(
      By.css('.lcars-text-bar span'),
    );
    const messageElement = getMessageElement(
      fixture,
      '.lcars-info-message',
    ).query(By.css('p'));
    expect(titleElement.nativeElement.textContent).toBe('');
    expect(messageElement.nativeElement.textContent).toBe('');
  });
});
