import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LcarsLevelLockComponent } from './lcars-level-lock.component';

describe('LcarsLevelLockComponent', () => {
  let component: LcarsLevelLockComponent;
  let fixture: ComponentFixture<LcarsLevelLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcarsLevelLockComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsLevelLockComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the feature, required level and current level', () => {
    fixture.componentRef.setInput('featureName', 'Reputations');
    fixture.componentRef.setInput('requiredLevel', 50);
    fixture.componentRef.setInput('currentLevel', 32);
    fixture.componentRef.setInput('characterHandle', 'Seven');
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('.lcars-text-bar span'));
    const message = fixture.debugElement.query(By.css('.lock-message'));

    expect(title.nativeElement.textContent).toContain('Reputations Locked');
    expect(message.nativeElement.textContent).toContain(
      'Reputations becomes available at level 50',
    );
    expect(message.nativeElement.textContent).toContain(
      'Seven is currently level 32',
    );
  });

  it('should omit the current level when it is unknown', () => {
    fixture.componentRef.setInput('currentLevel', null);
    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.lock-message'));
    expect(message.nativeElement.textContent).not.toContain('currently level');
  });

  it('should fall back to a generic captain label without a handle', () => {
    fixture.componentRef.setInput('currentLevel', 10);
    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.lock-message'));
    expect(message.nativeElement.textContent).toContain(
      'This captain is currently level 10',
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
