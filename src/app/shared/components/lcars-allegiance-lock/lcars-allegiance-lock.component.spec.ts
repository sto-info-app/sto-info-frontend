import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LcarsAllegianceLockComponent } from './lcars-allegiance-lock.component';

describe('LcarsAllegianceLockComponent', () => {
  let component: LcarsAllegianceLockComponent;
  let fixture: ComponentFixture<LcarsAllegianceLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsAllegianceLockComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsAllegianceLockComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the feature and the recorded allegiance', () => {
    fixture.componentRef.setInput('featureName', 'Commendations');
    fixture.componentRef.setInput('currentAllegiance', 'Undecided');
    fixture.componentRef.setInput('characterHandle', 'Seven');
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('.lcars-text-bar span'));
    const message = fixture.debugElement.query(By.css('.lock-message'));

    expect(title.nativeElement.textContent).toContain('Commendations Locked');
    expect(message.nativeElement.textContent).toContain(
      'Requires a general allegiance of Federation or Klingon',
    );
    expect(message.nativeElement.textContent).toContain(
      'Seven is currently Undecided',
    );
  });

  it('should say so when no allegiance is recorded', () => {
    fixture.componentRef.setInput('currentAllegiance', null);
    fixture.componentRef.setInput('characterHandle', 'Seven');
    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.lock-message'));
    expect(message.nativeElement.textContent).toContain(
      'Seven has no allegiance recorded',
    );
  });

  it('should fall back to a generic captain label without a handle', () => {
    fixture.componentRef.setInput('currentAllegiance', 'Undecided');
    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.lock-message'));
    expect(message.nativeElement.textContent).toContain(
      'This captain is currently Undecided',
    );
  });

  it('should point the CTA at the supplied edit link', () => {
    fixture.componentRef.setInput('editLink', [
      '/dashboard/accounts',
      'Test~1234',
      'Seven',
      'edit',
    ]);
    fixture.detectChanges();

    const cta = fixture.debugElement.query(By.css('.buttons-row a'));
    expect(cta.attributes['href']).toContain('/Seven/edit');
  });
});
