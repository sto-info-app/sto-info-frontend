import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

  const setComponentProperties = (
    properties: Partial<LcarsWarningMessageComponent>,
  ) => {
    Object.assign(component, properties);
    fixture.detectChanges();
  };

  it('should have correct title and message', () => {
    setComponentProperties({ title: 'Test Title', message: 'Test Message' });

    const titleElement = fixture.debugElement.query(
      By.css('.go-october-sunset'),
    );
    expect(titleElement.nativeElement.textContent).toEqual('Test Title');

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-warning-message p'),
    );
    expect(messageElement.nativeElement.textContent).toEqual('Test Message');
  });

  it('should add blink class if blinkMessage is true', () => {
    setComponentProperties({ blinkMessage: true });

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-warning-message'),
    );
    expect(messageElement.classes['blink']).toBeTrue();
  });

  it('should not add blink class if blinkMessage is false', () => {
    setComponentProperties({ blinkMessage: false });

    const messageElement = fixture.debugElement.query(
      By.css('.lcars-warning-message'),
    );
    expect(
      messageElement.nativeElement.classList.contains('blink'),
    ).toBeFalse();
  });
});
