import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  STORYTIME_POLICY_EFFECTIVE_DATE,
  STORYTIME_POLICY_VERSION,
} from '../../storytime.constants';
import { PolicyHeaderComponent } from './policy-header.component';

describe('PolicyHeaderComponent', () => {
  let fixture: ComponentFixture<PolicyHeaderComponent>;

  /**
   * Renders the header for one of the three documents.
   *
   * @param current - Which document is being shown.
   * @returns The rendered element.
   */
  const render = (current: 'policy' | 'terms' | 'notice'): HTMLElement => {
    fixture.componentRef.setInput('title', 'A Document');
    fixture.componentRef.setInput('intro', 'What it is for.');
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PolicyHeaderComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(PolicyHeaderComponent);
  });

  it('is created', () => {
    expect(render('policy')).toBeTruthy();
  });

  it('shows the title and intro it was given', () => {
    const element = render('policy');

    expect(element.querySelector('h1')?.textContent).toContain('A Document');
    expect(element.textContent).toContain('What it is for.');
  });

  // A creator asked to accept terms has to be able to tell which terms.
  it('states the version and when it took effect', () => {
    const text = render('terms').textContent ?? '';

    expect(text).toContain(STORYTIME_POLICY_VERSION);
    expect(text).toContain(STORYTIME_POLICY_EFFECTIVE_DATE);
  });

  // The three documents defer to each other, so each has to reach the others.
  it.each([
    ['policy' as const, 2],
    ['terms' as const, 2],
    ['notice' as const, 2],
  ])('links to the other documents from %s', (current, expectedLinks) => {
    const element = render(current);

    expect(element.querySelectorAll('nav a')).toHaveLength(expectedLinks);
  });

  // Following a link back to the page you are already on tells you nothing.
  it.each([
    ['policy' as const, 'Content Policy'],
    ['terms' as const, 'Terms of Use'],
    ['notice' as const, 'Fan Content & IP Notice'],
  ])(
    'marks %s as the current page rather than linking it',
    (current, label) => {
      const element = render(current);
      const marker = element.querySelector('nav [aria-current="page"]');

      expect(marker?.textContent?.trim()).toBe(label);
    },
  );
});
