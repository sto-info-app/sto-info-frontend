import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LcarsInformationMessageComponent } from './lcars-information-message.component';

describe('LcarsInformationMessageComponent', () => {
  let component: LcarsInformationMessageComponent;
  let fixture: ComponentFixture<LcarsInformationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LcarsInformationMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsInformationMessageComponent);
    component = fixture.componentInstance;
  });

  const getMessageElement = () =>
    fixture.debugElement.query(By.css('.lcars-info-message'));
  const setComponentProperties = (
    title: string,
    message: string,
    blinkMessage: boolean,
  ) => {
    component.title = title;
    component.message = message;
    component.blinkMessage = blinkMessage;
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title and message', () => {
    setComponentProperties('Test Title', 'Test Message', false);

    const titleElement = fixture.debugElement.query(
      By.css('.lcars-text-bar span'),
    );
    const messageElement = getMessageElement().query(By.css('p'));
    expect(titleElement.nativeElement.textContent).toBe('Test Title');
    expect(messageElement.nativeElement.textContent).toBe('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties('', '', true);

    const messageElement = getMessageElement();
    expect(messageElement.nativeElement.classList.contains('blink')).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties('', '', false);

    const messageElement = getMessageElement();
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
