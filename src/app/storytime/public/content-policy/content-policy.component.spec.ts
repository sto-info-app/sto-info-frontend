import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CONTENT_POLICY_RULES,
  STORYTIME_COPY,
} from '../../storytime.constants';
import { ContentPolicyComponent } from './content-policy.component';

describe('ContentPolicyComponent', () => {
  let fixture: ComponentFixture<ContentPolicyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContentPolicyComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(ContentPolicyComponent);
    fixture.detectChanges();
  });

  it('is created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // The categories on this page are the ones a reporter picks from and an
  // administrator cites, so every one of them has to be here.
  it.each(CONTENT_POLICY_RULES.map(rule => rule.title))(
    'sets out the rule on %s',
    title => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        title,
      );
    },
  );

  it('explains what a report does, and does not do', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('never removes anything by itself');
    expect(text).toContain('never told who reported them');
  });

  // Somebody whose work is removed has to know they can answer it.
  it('explains that a removal can be appealed', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'appeal once',
    );
  });

  // Required wherever fan-created Star Trek content is published.
  it('carries the fan content notice', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      STORYTIME_COPY.FAN_CONTENT_NOTICE,
    );
  });
});
