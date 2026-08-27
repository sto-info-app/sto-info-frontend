import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { STORYTIME_COPY } from '../../storytime.constants';
import { FanContentNoticeComponent } from './fan-content-notice.component';

describe('FanContentNoticeComponent', () => {
  let fixture: ComponentFixture<FanContentNoticeComponent>;

  /** The rendered page text. */
  let text: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FanContentNoticeComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(FanContentNoticeComponent);
    fixture.detectChanges();
    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
  });

  it('is created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // The point of the document: a rights holder arriving here should find the
  // disclaimer without reading anything else.
  it('disclaims affiliation with the rights holders by name', () => {
    expect(text).toContain('CBS Studios');
    expect(text).toContain('Paramount');
    expect(text).toContain('Cryptic Studios');
    expect(text).toContain('not affiliated with, sponsored by, approved by or');
  });

  it('states that STO Info claims no ownership of Star Trek', () => {
    expect(text).toContain('STO Info claims no ownership');
  });

  // The other half of the balance: creators keep what they wrote.
  it('states that creators keep rights in their original contributions', () => {
    expect(text).toContain('those rights stay with the creator');
  });

  // The example that stops somebody thinking an original character gives them
  // the setting it stands in.
  it('explains the limit of what an original character grants', () => {
    expect(text).toContain(
      'it does not give you Starfleet, the Federation, or Star Trek',
    );
  });

  it('states that credit is not permission', () => {
    expect(text).toContain('Credit is not a substitute for permission');
  });

  // This page is where the short-form notice comes from.
  it('carries the fan content notice', () => {
    expect(text).toContain(STORYTIME_COPY.FAN_CONTENT_NOTICE);
  });
});
