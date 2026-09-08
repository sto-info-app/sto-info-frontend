import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
} from '../../storytime.constants';
import { StorytimeTermsComponent } from './storytime-terms.component';

describe('StorytimeTermsComponent', () => {
  let fixture: ComponentFixture<StorytimeTermsComponent>;

  /** The rendered page text. */
  let text: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StorytimeTermsComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StorytimeTermsComponent);
    fixture.detectChanges();
    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
  });

  it('is created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // These are the promises a creator makes at the moment they publish, so the
  // document stating them and the checklist collecting them have to match.
  it.each(PUBLISHING_REPRESENTATIONS)('sets out that %s', representation => {
    expect(text).toContain(representation);
  });

  // The whole service rests on this, and the Terms say it twice for a reason.
  it('states that the licence granted cannot be used to sell or paywall work', () => {
    expect(text).toContain('charge for access to it');
    expect(text).toContain('non-exclusive, worldwide, royalty-free licence');
  });

  it('states that creators keep their original work', () => {
    expect(text).toContain(
      'you keep whatever rights you are legally entitled to hold',
    );
  });

  it('states that STO Info may use published stories in videos and images', () => {
    expect(text).toContain('use published Stories in videos and images');
    expect(text).toContain('STO Info may also use published Stories');
  });

  // A creator who believes the site is their backup will eventually lose work.
  it('warns that STO Info is not a backup', () => {
    expect(text).toContain('STO Info is not a backup of your writing');
  });

  // Removal, appeal and the fact that a report alone does nothing.
  it('explains moderation, removal and the single appeal', () => {
    expect(text).toContain('A report never removes anything by itself');
    expect(text).toContain('appeal a removal once');
  });

  it('carries the fan content notice', () => {
    expect(text).toContain(STORYTIME_COPY.FAN_CONTENT_NOTICE);
  });

  it('resolves site-wide route links', () => {
    expect(fixture.componentInstance.getRouteLink('/privacy-policy')).toContain(
      'privacy-policy',
    );
  });
});
