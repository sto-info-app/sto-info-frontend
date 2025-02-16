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

  function setComponentProperties(
    properties: Partial<LcarsErrorMessageComponent>,
  ) {
    Object.assign(component, properties);
    fixture.detectChanges();
  }

  function queryElement(selector: string) {
    return fixture.debugElement.query(By.css(selector)).nativeElement;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct title and message', () => {
    setComponentProperties({ title: 'Test Title', message: 'Test Message' });

    const titleElement = queryElement('.go-mars');
    expect(titleElement.textContent).toEqual('Test Title');

    const messageElement = queryElement('.lcars-error-message p');
    expect(messageElement.textContent).toEqual('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties({ blinkMessage: true });

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-error-message'),
    );
    expect(messageElement.classes['blink']).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties({ blinkMessage: false });

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-error-message'),
    );
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
