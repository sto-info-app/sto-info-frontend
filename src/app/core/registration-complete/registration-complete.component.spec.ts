import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RegistrationCompleteComponent } from './registration-complete.component';

describe('RegistrationCompleteComponent', () => {
  let component: RegistrationCompleteComponent;
  let fixture: ComponentFixture<RegistrationCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegistrationCompleteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationCompleteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title', () => {
    fixture.detectChanges();

    const titleElement = fixture.debugElement.query(By.css('h1'));
    expect(titleElement.nativeElement.textContent).toBe(
      'Registration Complete',
    );
  });

  it('should display the correct messages', () => {
    fixture.detectChanges();

    const messageElements = fixture.debugElement.queryAll(By.css('p'));
    expect(messageElements[0].nativeElement.textContent).toContain(
      'Congratulations, you have successfully registered.',
    );
    expect(messageElements[1].nativeElement.textContent).toContain(
      'To complete your registration process, we need to verify your email address.',
    );
    expect(messageElements[2].nativeElement.textContent).toContain(
      'Please check your inbox for an email from us and follow the instructions to verify your account.',
    );
    expect(messageElements[3].nativeElement.textContent).toContain(
      'Thank you for choosing to be a part of our community!',
    );
    expect(messageElements[4].nativeElement.textContent).toContain(
      'Live long and prosper',
    );
  });

  //NOTE: Reinstate and fix this test - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components
  it('should display the correct link', () => {
    fixture.detectChanges();

    const linkElement = fixture.debugElement.query(By.css('.buttons a'));
    expect(linkElement.nativeElement.textContent.trim()).toBe('Login');
    expect(linkElement.nativeElement.getAttribute('href')).toBe('/login');
  });
});
